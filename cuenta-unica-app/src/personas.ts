// Reglas de las personas de la cuenta única (spec 005). El usuario ES el carnet: minúsculas, complemento tras guion.

export interface Persona {
  readonly usuario: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly claveHash: string;
  readonly cambiarClave: boolean;
  readonly activo: boolean;
}

/** `7788990-1B` → `7788990-1b`; quita espacios y puntos. Devuelve null si no parece un carnet. */
export const normalizarUsuario = (texto: string): string | null => {
  const u = texto.trim().toLowerCase().replace(/[\s.]/g, '');
  return /^[0-9]{4,12}(-[0-9a-z]{1,4})?$/.test(u) ? u : null;
};

export const nombreCompleto = (p: Pick<Persona, 'nombres' | 'apellidos'>): string =>
  `${p.nombres} ${p.apellidos}`.replace(/\s+/g, ' ').trim();

/** Motivo por el que la clave nueva no sirve, o null si sirve. */
export const problemaClaveNueva = (clave: string, repetida: string, usuario: string): string | null => {
  if (clave !== repetida) return 'Las dos claves no son iguales.';
  if (clave.length < 10) return 'La clave debe tener al menos 10 caracteres.';
  if (clave.length > 128) return 'La clave es demasiado larga.';
  if (!/[a-zA-Z]/.test(clave) || !/[0-9]/.test(clave)) return 'La clave debe tener letras y números.';
  if (clave.toLowerCase().includes(usuario.split('-')[0] ?? usuario)) return 'La clave no puede contener su carnet.';
  return null;
};

/** Bloqueo por carnet: 5 fallos dentro de la ventana bloquean hasta que pase la ventana desde el último fallo. */
export const INTENTOS_MAXIMOS = 5;
export const VENTANA_BLOQUEO_SEG = 15 * 60;

export const estaBloqueado = (fallos: number, ultimoFallo: number | null, ahora: number): boolean =>
  fallos >= INTENTOS_MAXIMOS && ultimoFallo !== null && ahora - ultimoFallo < VENTANA_BLOQUEO_SEG;

/** Sesión: 30 min de inactividad, máximo 8 h desde el ingreso. Devuelve los segundos que le quedan. */
export const INACTIVIDAD_SEG = 30 * 60;
export const MAXIMO_SESION_SEG = 8 * 60 * 60;

export const vidaSesion = (ingreso: number | undefined, ahora: number): number => {
  if (ingreso === undefined) return INACTIVIDAD_SEG;
  return Math.max(1, Math.min(INACTIVIDAD_SEG, ingreso + MAXIMO_SESION_SEG - ahora));
};
