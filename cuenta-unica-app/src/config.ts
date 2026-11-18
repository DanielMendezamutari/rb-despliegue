import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Cliente (sistema) registrado. `secreto` ausente = cliente público con PKCE (el portal). */
export interface Cliente {
  readonly id: string;
  readonly nombre: string;
  readonly secreto?: string;
  readonly retornos: readonly string[];
  readonly salidas?: readonly string[];
}

export interface JwkPrivada { readonly kty: string; readonly kid?: string; readonly [k: string]: unknown }

/** Todo en UN archivo privado (600) fuera de public_html: ~/cuenta-unica-datos/config.json en el hosting. */
export interface Configuracion {
  /** p. ej. https://cuenta.ribersoft.com/realms/riberbulma (sin barra final). */
  readonly emisor: string;
  /** `mysql://usuario:clave@localhost/base` o `memoria` (solo pruebas). */
  readonly baseDatos: string;
  /** Orígenes que pueden mostrar la cuenta única en un marco (frame-ancestors). */
  readonly marcos: readonly string[];
  readonly clientes: readonly Cliente[];
  readonly jwks: { readonly keys: readonly JwkPrivada[] };
  /** Claves para firmar cookies (la primera firma; las demás solo verifican, para rotar). */
  readonly cookies: readonly string[];
  /** Solo desarrollo: personas que se crean al arrancar si no existen (nunca en el hosting). */
  readonly personasDePrueba?: readonly { usuario: string; nombres: string; apellidos: string; clave: string }[];
}

export class ErrorConfiguracion extends Error {
  override readonly name = 'ErrorConfiguracion';
}

export const rutaConfiguracion = (): string =>
  process.env['CU_CONFIG'] ?? join(homedir(), 'cuenta-unica-datos', 'config.json');

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export const validarConfiguracion = (datos: unknown): Configuracion => {
  if (typeof datos !== 'object' || datos === null) throw new ErrorConfiguracion('La configuración no es un objeto JSON.');
  const c = datos as Partial<Configuracion>;
  if (!esTexto(c.emisor) || !/^https?:\/\/[^/]+\/realms\/[a-z0-9-]+$/.test(c.emisor)) {
    throw new ErrorConfiguracion('emisor debe ser https://<host>/realms/<reino> (sin barra final).');
  }
  if (!esTexto(c.baseDatos)) throw new ErrorConfiguracion('Falta baseDatos.');
  if (!Array.isArray(c.clientes) || c.clientes.length === 0) throw new ErrorConfiguracion('Faltan clientes.');
  for (const cl of c.clientes) {
    if (!esTexto(cl.id) || !Array.isArray(cl.retornos) || cl.retornos.length === 0) {
      throw new ErrorConfiguracion(`Cliente inválido: ${String(cl.id)} (necesita id y retornos).`);
    }
    // En el hosting (https) los secretos son largos y al azar; en local se aceptan los *-secreto-local de 002.
    if (cl.secreto !== undefined && c.emisor.startsWith('https://') && cl.secreto.length < 32) throw new ErrorConfiguracion(`El secreto de ${cl.id} es muy corto.`);
  }
  if (!c.jwks || !Array.isArray(c.jwks.keys) || c.jwks.keys.length === 0) throw new ErrorConfiguracion('Faltan las claves de firma (jwks).');
  if (!Array.isArray(c.cookies) || c.cookies.length === 0 || c.cookies.some((k) => !esTexto(k) || k.length < 32)) {
    throw new ErrorConfiguracion('Faltan claves de cookies (32+ caracteres).');
  }
  return { marcos: [], ...c } as Configuracion;
};

export const leerConfiguracion = (ruta = rutaConfiguracion()): Configuracion => {
  let texto: string;
  try {
    texto = readFileSync(ruta, 'utf8');
  } catch {
    throw new ErrorConfiguracion(`No se pudo leer ${ruta}. Corra primero: node src/admin.ts configurar`);
  }
  return validarConfiguracion(JSON.parse(texto));
};
