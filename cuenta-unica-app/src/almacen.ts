import type { Persona } from './personas.ts';

/** Artefacto de oidc-provider (sesión, código, token, interacción...) tal como lo entrega el adaptador. */
export type Carga = Record<string, unknown>;

export interface Intentos {
  readonly fallos: number;
  readonly ultimoFallo: number | null;
}

/** Todo lo que el servidor guarda. Dos implementaciones: memoria (pruebas) y MariaDB (hosting). */
export interface Almacen {
  persona(usuario: string): Promise<Persona | null>;
  guardarPersona(p: Persona): Promise<'creada' | 'actualizada'>;
  existe(usuario: string): Promise<boolean>;
  listar(): Promise<Persona[]>;

  intentos(usuario: string): Promise<Intentos>;
  registrarFallo(usuario: string, ahora: number): Promise<void>;
  limpiarIntentos(usuario: string): Promise<void>;

  /** Cambio de clave pendiente, atado a la interacción (uid) que lo pidió. */
  guardarPendiente(uid: string, usuario: string, venceEn: number): Promise<void>;
  pendiente(uid: string, ahora: number): Promise<string | null>;
  borrarPendiente(uid: string): Promise<void>;

  oidcGuardar(modelo: string, id: string, carga: Carga, venceEn: number | null): Promise<void>;
  oidcBuscar(modelo: string, id: string, ahora: number): Promise<Carga | null>;
  oidcBuscarPor(modelo: string, campo: 'uid' | 'userCode', valor: string, ahora: number): Promise<Carga | null>;
  oidcConsumir(modelo: string, id: string, ahora: number): Promise<void>;
  oidcBorrar(modelo: string, id: string): Promise<void>;
  oidcRevocarGrant(grantId: string): Promise<void>;

  cerrar(): Promise<void>;
}

interface Fila { carga: Carga; vence: number | null }

export const crearAlmacenMemoria = (): Almacen => {
  const personas = new Map<string, Persona>();
  const intentos = new Map<string, Intentos>();
  const pendientes = new Map<string, { usuario: string; vence: number }>();
  const oidc = new Map<string, Fila>();
  const clave = (modelo: string, id: string): string => `${modelo}:${id}`;
  const vigente = (f: Fila | undefined, ahora: number): Carga | null => (f && (f.vence === null || f.vence > ahora) ? f.carga : null);

  return {
    persona: async (u) => personas.get(u) ?? null,
    guardarPersona: async (p) => {
      const habia = personas.has(p.usuario);
      personas.set(p.usuario, p);
      return habia ? 'actualizada' : 'creada';
    },
    existe: async (u) => personas.has(u),
    listar: async () => [...personas.values()].sort((a, b) => a.usuario.localeCompare(b.usuario)),
    intentos: async (u) => intentos.get(u) ?? { fallos: 0, ultimoFallo: null },
    registrarFallo: async (u, ahora) => {
      const i = intentos.get(u) ?? { fallos: 0, ultimoFallo: null };
      intentos.set(u, { fallos: i.fallos + 1, ultimoFallo: ahora });
    },
    limpiarIntentos: async (u) => { intentos.delete(u); },
    guardarPendiente: async (uid, usuario, venceEn) => { pendientes.set(uid, { usuario, vence: venceEn }); },
    pendiente: async (uid, ahora) => {
      const p = pendientes.get(uid);
      return p && p.vence > ahora ? p.usuario : null;
    },
    borrarPendiente: async (uid) => { pendientes.delete(uid); },
    oidcGuardar: async (modelo, id, carga, vence) => { oidc.set(clave(modelo, id), { carga, vence }); },
    oidcBuscar: async (modelo, id, ahora) => vigente(oidc.get(clave(modelo, id)), ahora),
    oidcBuscarPor: async (modelo, campo, valor, ahora) => {
      for (const [k, f] of oidc) if (k.startsWith(`${modelo}:`) && f.carga[campo] === valor) return vigente(f, ahora);
      return null;
    },
    oidcConsumir: async (modelo, id, ahora) => {
      const f = oidc.get(clave(modelo, id));
      if (f) f.carga = { ...f.carga, consumed: ahora };
    },
    oidcBorrar: async (modelo, id) => { oidc.delete(clave(modelo, id)); },
    oidcRevocarGrant: async (grantId) => {
      for (const [k, f] of oidc) if (f.carga['grantId'] === grantId) oidc.delete(k);
    },
    cerrar: async () => undefined,
  };
};
