import { createServer } from 'node:http';
import { crearAlmacenMemoria, type Almacen } from './almacen.ts';
import { crearAplicacion } from './aplicacion.ts';
import { cifrarClave } from './claves.ts';
import { leerConfiguracion, type Configuracion } from './config.ts';
import { crearProveedor } from './proveedor.ts';

export const abrirAlmacen = async (config: Configuracion): Promise<Almacen> => {
  if (config.baseDatos === 'memoria') return crearAlmacenMemoria();
  const { crearAlmacenMysql } = await import('./almacen-mysql.ts');
  const almacen = crearAlmacenMysql(config.baseDatos);
  await almacen.migrar(); // CREATE TABLE IF NOT EXISTS: barato y evita olvidar `admin migrar`.
  return almacen;
};

const sembrarPruebas = async (config: Configuracion, almacen: Almacen): Promise<void> => {
  for (const p of config.personasDePrueba ?? []) {
    if (await almacen.existe(p.usuario)) continue;
    await almacen.guardarPersona({ usuario: p.usuario, nombres: p.nombres, apellidos: p.apellidos, claveHash: await cifrarClave(p.clave), cambiarClave: false, activo: true });
  }
};

const config = leerConfiguracion();
const almacen = await abrirAlmacen(config);
await sembrarPruebas(config, almacen);
const atender = crearAplicacion(config, almacen, crearProveedor(config, almacen));

const servidor = createServer((req, res) => {
  void (async () => {
    try {
      await atender(req, res);
    } catch (e) {
      console.error('[cuenta-unica] error:', e instanceof Error ? e.name : 'desconocido');
      if (!res.headersSent) { res.statusCode = 500; res.end('Error interno'); }
    }
  })();
});

// Passenger (Setup Node.js App) intercepta listen(); en local se usa PORT o 8080 (mismo puerto que Keycloak).
const puerto = Number(process.env['PORT'] ?? 8080);
servidor.listen(puerto, () => { console.log(`[cuenta-unica] emisor ${config.emisor} · puerto ${puerto}`); });

const cerrar = (): void => { servidor.close(() => { void almacen.cerrar(); }); };
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);
