import { createPool, type RowDataPacket } from 'mysql2/promise';
import type { Almacen, Carga } from './almacen.ts';
import type { Persona } from './personas.ts';

/** Tablas (prefijo cu_). Se crean con `admin migrar`; repetirlo no cambia nada. */
export const MIGRACIONES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS cu_personas (
    usuario VARCHAR(32) NOT NULL PRIMARY KEY,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,
    cambiar_clave TINYINT(1) NOT NULL DEFAULT 1,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS cu_intentos (
    usuario VARCHAR(32) NOT NULL PRIMARY KEY,
    fallos INT NOT NULL DEFAULT 0,
    ultimo_fallo BIGINT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS cu_pendientes (
    uid VARCHAR(64) NOT NULL PRIMARY KEY,
    usuario VARCHAR(32) NOT NULL,
    vence BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS cu_oidc (
    modelo VARCHAR(40) NOT NULL,
    id VARCHAR(255) NOT NULL,
    carga LONGTEXT NOT NULL,
    uid VARCHAR(64) NULL,
    user_code VARCHAR(64) NULL,
    grant_id VARCHAR(64) NULL,
    vence BIGINT NULL,
    PRIMARY KEY (modelo, id),
    KEY cu_oidc_uid (uid),
    KEY cu_oidc_grant (grant_id),
    KEY cu_oidc_vence (vence)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

interface FilaPersona extends RowDataPacket {
  usuario: string; nombres: string; apellidos: string; clave_hash: string; cambiar_clave: number; activo: number;
}

const aPersona = (f: FilaPersona): Persona => ({
  usuario: f.usuario, nombres: f.nombres, apellidos: f.apellidos, claveHash: f.clave_hash,
  cambiarClave: f.cambiar_clave === 1, activo: f.activo === 1,
});

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export const crearAlmacenMysql = (url: string): Almacen & { migrar(): Promise<void> } => {
  const pool = createPool({ uri: url, connectionLimit: 4, charset: 'utf8mb4', timezone: 'Z' });
  let operaciones = 0;

  // Sin cron: cada ~200 escrituras se borran los artefactos vencidos.
  const limpiarDeVezEnCuando = async (): Promise<void> => {
    operaciones += 1;
    if (operaciones % 200 !== 0) return;
    const ahora = Math.floor(Date.now() / 1000);
    await pool.query('DELETE FROM cu_oidc WHERE vence IS NOT NULL AND vence < ?', [ahora - 60]);
    await pool.query('DELETE FROM cu_pendientes WHERE vence < ?', [ahora]);
  };

  const filaCarga = async (sql: string, valores: unknown[], ahora: number): Promise<Carga | null> => {
    const [filas] = await pool.query<RowDataPacket[]>(sql, valores);
    const f = filas[0];
    if (!f || (f['vence'] !== null && Number(f['vence']) <= ahora)) return null;
    return JSON.parse(String(f['carga'])) as Carga;
  };

  return {
    migrar: async () => { for (const sql of MIGRACIONES) await pool.query(sql); },
    persona: async (u) => {
      const [filas] = await pool.query<FilaPersona[]>('SELECT * FROM cu_personas WHERE usuario = ?', [u]);
      return filas[0] ? aPersona(filas[0]) : null;
    },
    guardarPersona: async (p) => {
      const [r] = await pool.query<RowDataPacket[]>('SELECT 1 FROM cu_personas WHERE usuario = ?', [p.usuario]);
      await pool.query(
        `INSERT INTO cu_personas (usuario, nombres, apellidos, clave_hash, cambiar_clave, activo) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos), clave_hash = VALUES(clave_hash),
         cambiar_clave = VALUES(cambiar_clave), activo = VALUES(activo)`,
        [p.usuario, p.nombres, p.apellidos, p.claveHash, p.cambiarClave ? 1 : 0, p.activo ? 1 : 0],
      );
      return r.length > 0 ? 'actualizada' : 'creada';
    },
    existe: async (u) => {
      const [r] = await pool.query<RowDataPacket[]>('SELECT 1 FROM cu_personas WHERE usuario = ?', [u]);
      return r.length > 0;
    },
    listar: async () => {
      const [filas] = await pool.query<FilaPersona[]>('SELECT * FROM cu_personas ORDER BY usuario');
      return filas.map(aPersona);
    },
    intentos: async (u) => {
      const [filas] = await pool.query<RowDataPacket[]>('SELECT fallos, ultimo_fallo FROM cu_intentos WHERE usuario = ?', [u]);
      const f = filas[0];
      return f ? { fallos: Number(f['fallos']), ultimoFallo: f['ultimo_fallo'] === null ? null : Number(f['ultimo_fallo']) } : { fallos: 0, ultimoFallo: null };
    },
    registrarFallo: async (u, ahora) => {
      await pool.query(
        `INSERT INTO cu_intentos (usuario, fallos, ultimo_fallo) VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE fallos = fallos + 1, ultimo_fallo = VALUES(ultimo_fallo)`, [u, ahora]);
    },
    limpiarIntentos: async (u) => { await pool.query('DELETE FROM cu_intentos WHERE usuario = ?', [u]); },
    guardarPendiente: async (uid, usuario, vence) => {
      await pool.query('REPLACE INTO cu_pendientes (uid, usuario, vence) VALUES (?, ?, ?)', [uid, usuario, vence]);
    },
    pendiente: async (uid, ahora) => {
      const [filas] = await pool.query<RowDataPacket[]>('SELECT usuario FROM cu_pendientes WHERE uid = ? AND vence > ?', [uid, ahora]);
      return filas[0] ? String(filas[0]['usuario']) : null;
    },
    borrarPendiente: async (uid) => { await pool.query('DELETE FROM cu_pendientes WHERE uid = ?', [uid]); },
    oidcGuardar: async (modelo, id, carga, vence) => {
      await pool.query(
        `REPLACE INTO cu_oidc (modelo, id, carga, uid, user_code, grant_id, vence) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [modelo, id, JSON.stringify(carga), texto(carga['uid']), texto(carga['userCode']), texto(carga['grantId']), vence],
      );
      await limpiarDeVezEnCuando();
    },
    oidcBuscar: async (modelo, id, ahora) => filaCarga('SELECT carga, vence FROM cu_oidc WHERE modelo = ? AND id = ?', [modelo, id], ahora),
    oidcBuscarPor: async (modelo, campo, valor, ahora) =>
      filaCarga(`SELECT carga, vence FROM cu_oidc WHERE modelo = ? AND ${campo === 'uid' ? 'uid' : 'user_code'} = ? LIMIT 1`, [modelo, valor], ahora),
    oidcConsumir: async (modelo, id, ahora) => {
      await pool.query(`UPDATE cu_oidc SET carga = JSON_SET(carga, '$.consumed', ?) WHERE modelo = ? AND id = ?`, [ahora, modelo, id]);
    },
    oidcBorrar: async (modelo, id) => { await pool.query('DELETE FROM cu_oidc WHERE modelo = ? AND id = ?', [modelo, id]); },
    oidcRevocarGrant: async (grantId) => { await pool.query('DELETE FROM cu_oidc WHERE grant_id = ?', [grantId]); },
    cerrar: async () => { await pool.end(); },
  };
};
