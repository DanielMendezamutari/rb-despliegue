#!/usr/bin/env node
// Administración de la cuenta única desde la Terminal del cPanel (spec 005). Uso: node src/admin.ts <comando>
import { generateKeyPairSync, randomBytes, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import type { Almacen } from './almacen.ts';
import { crearAlmacenMysql } from './almacen-mysql.ts';
import { cifrarClave } from './claves.ts';
import { type Cliente, type Configuracion, leerConfiguracion, rutaConfiguracion, validarConfiguracion } from './config.ts';
import { nombreCompleto, normalizarUsuario } from './personas.ts';

const AYUDA = `Cuenta única · administración

  configurar-local                       Configuración de desarrollo (localhost:8080, secretos *-secreto-local)
  configurar --dominio ribersoft.com     Crea el archivo de configuración (claves y secretos nuevos). Lee CU_BASE.
  migrar                                 Crea las tablas (repetible)
  importar <personas-cuenta-unica.json>  Crea las personas del padrón con clave temporal (omite las que existen)
  crear <carnet> <nombres> <apellidos>   Crea una persona y muestra su clave temporal
  clave <carnet>                         Nueva clave temporal (pide cambiarla al entrar) y desbloquea
  desactivar <carnet> | activar <carnet> Quita o devuelve el acceso
  desbloquear <carnet>                   Borra los intentos fallidos
  listar                                 Personas (carnet, nombre, estado)
  secretos                               Variables que cada sistema necesita (muestra secretos: cuidado)

Configuración: ${'$'}CU_CONFIG o ~/cuenta-unica-datos/config.json`;

const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnpqrstuvwxyz';
const DIGITOS = '23456789';
const elegir = (de: string): string => de[randomInt(de.length)] ?? '';

/** Clave temporal legible (sin 0/O, 1/l/I), con mayúscula, minúscula y dígito. */
export const claveTemporal = (largo = 12): string => {
  const c = [elegir(MAYUSCULAS), elegir(MINUSCULAS), elegir(DIGITOS)];
  while (c.length < largo) c.push(elegir(MAYUSCULAS + MINUSCULAS + DIGITOS));
  for (let i = c.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [c[i], c[j]] = [c[j] ?? '', c[i] ?? ''];
  }
  return c.join('');
};

const secreto = (): string => randomBytes(32).toString('base64url');

/** Clientes de producción con las direcciones de `*.<dominio>` (guía DESPLIEGUE-UNIFICADO, etapa 2). */
export const clientesProduccion = (dominio: string): Cliente[] => [
  { id: 'portal', nombre: 'Portal', retornos: [`https://portal.${dominio}/callback`], salidas: [`https://portal.${dominio}/`] },
  { id: 'seguimiento', nombre: 'Seguimiento', secreto: secreto(), retornos: [`https://seguimiento.${dominio}/api/sso/callback`] },
  { id: 'cobros', nombre: 'Cobros', secreto: secreto(), retornos: [`https://rb.${dominio}/api/v1/auth/sso/callback`] },
  { id: 'captacion', nombre: 'Captación', secreto: secreto(), retornos: [`https://captacion.${dominio}/api/cuenta-unica/callback`] },
  { id: 'panel-web', nombre: 'Panel web', secreto: secreto(), retornos: [`https://panel.${dominio}/api/sso/callback`] },
];

export const configuracionNueva = (dominio: string, baseDatos: string): Configuracion => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...privateKey.export({ format: 'jwk' }), kid: `rb-${new Date().toISOString().slice(0, 10)}`, alg: 'RS256', use: 'sig' };
  return validarConfiguracion({
    emisor: `https://cuenta.${dominio}/realms/riberbulma`,
    baseDatos,
    marcos: [`https://*.${dominio}`],
    clientes: clientesProduccion(dominio),
    jwks: { keys: [jwk] },
    cookies: [secreto()],
  });
};

/** Desarrollo: mismos clientes y secretos que el reino de Keycloak local (cuenta-unica/realm-riberbulma.json). */
export const configuracionLocal = (baseDatos: string): Configuracion => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return validarConfiguracion({
    emisor: 'http://localhost:8080/realms/riberbulma',
    baseDatos,
    marcos: ['http://localhost:5185', 'http://localhost:3100', 'http://localhost:5173', 'http://localhost:5180', 'http://localhost:3000'],
    clientes: [
      { id: 'portal', nombre: 'Portal', retornos: ['http://localhost:5185/callback'], salidas: ['http://localhost:5185/'] },
      { id: 'seguimiento', nombre: 'Seguimiento', secreto: 'seguimiento-secreto-local', retornos: ['http://localhost:3100/api/sso/callback'] },
      { id: 'cobros', nombre: 'Cobros', secreto: 'cobros-secreto-local', retornos: ['http://localhost:5173/api/v1/auth/sso/callback'] },
      { id: 'captacion', nombre: 'Captación', secreto: 'captacion-secreto-local', retornos: [
        'http://127.0.0.1:56321/functions/v1/cuenta-unica/callback', 'http://localhost:56321/functions/v1/cuenta-unica/callback',
        'http://localhost:5180/api/cuenta-unica/callback'] },
      { id: 'panel-web', nombre: 'Panel web', secreto: 'panel-web-secreto-local', retornos: ['http://localhost:3000/api/sso/callback'] },
    ],
    jwks: { keys: [{ ...privateKey.export({ format: 'jwk' }), kid: 'local', alg: 'RS256', use: 'sig' }] },
    cookies: [secreto()],
    personasDePrueba: [
      { usuario: '7788990-1b', nombres: 'Jessica', apellidos: 'Prueba', clave: 'CuentaUnica2026' },
      { usuario: '5550001', nombres: 'Prueba', apellidos: 'Ficha E2E', clave: 'CuentaUnica2026' },
    ],
  });
};

const escribirPrivado = (ruta: string, contenido: string): void => {
  mkdirSync(dirname(ruta), { recursive: true, mode: 0o700 });
  writeFileSync(ruta, contenido, { mode: 0o600 });
};

const csv = (filas: string[][]): string => filas.map((f) => f.map((c) => `"${c.replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';

interface PersonaPadron { usuario?: string; ci?: string; nombres?: string; apellidos?: string; clave_temporal?: string }

const exigirCarnet = (texto: string | undefined): string => {
  const u = normalizarUsuario(texto ?? '');
  if (!u) throw new Error(`Carnet inválido: ${texto ?? '(vacío)'} (4 a 12 dígitos y complemento opcional, p. ej. 7788990-1B)`);
  return u;
};

const principal = async (argv: string[]): Promise<number> => {
  const { values, positionals } = parseArgs({
    args: argv, allowPositionals: true,
    options: { dominio: { type: 'string' }, salida: { type: 'string' }, reemplazar: { type: 'boolean', default: false } },
  });
  const [comando, ...args] = positionals;
  if (!comando) { console.log(AYUDA); return 2; }

  if (comando === 'configurar') {
    const ruta = rutaConfiguracion();
    if (existsSync(ruta) && !values.reemplazar) {
      console.log(`Ya existe ${ruta}: no se toca (los sistemas ya usan sus secretos). Use --reemplazar solo si quiere empezar de cero.`);
      return 0;
    }
    const base = process.env['CU_BASE'];
    if (!values.dominio || !base) { console.log('Uso: CU_BASE=mysql://usuario:clave@localhost/base node src/admin.ts configurar --dominio ribersoft.com'); return 2; }
    escribirPrivado(ruta, JSON.stringify(configuracionNueva(values.dominio, base), null, 2) + '\n');
    console.log(`Configuración creada en ${ruta} (permisos 600).`);
    return 0;
  }

  if (comando === 'configurar-local') {
    const ruta = rutaConfiguracion();
    escribirPrivado(ruta, JSON.stringify(configuracionLocal(process.env['CU_BASE'] ?? 'memoria'), null, 2) + '\n');
    console.log(`Configuración LOCAL creada en ${ruta}.`);
    return 0;
  }

  const config = leerConfiguracion();
  if (comando === 'secretos') {
    console.log(`# Emisor para TODOS: SSO_EMISOR=${config.emisor}\n`);
    for (const c of config.clientes) {
      console.log(`## ${c.nombre}\nSSO_CLIENTE=${c.id}`);
      if (c.secreto) console.log(`SSO_SECRETO=${c.secreto}`);
      console.log('');
    }
    return 0;
  }

  const almacen: Almacen & { migrar(): Promise<void> } = crearAlmacenMysql(config.baseDatos);
  try {
    switch (comando) {
      case 'migrar':
        await almacen.migrar();
        console.log('Tablas listas (cu_personas, cu_intentos, cu_pendientes, cu_oidc).');
        return 0;
      case 'importar': {
        if (!args[0]) { console.log('Uso: node src/admin.ts importar personas-cuenta-unica.json'); return 2; }
        const datos = JSON.parse(readFileSync(args[0], 'utf8')) as { formato?: string; personas?: PersonaPadron[] };
        if (datos.formato !== 'padron-cuenta-unica/1' || !Array.isArray(datos.personas)) throw new Error('El archivo no es del padrón (formato padron-cuenta-unica/1).');
        const filas = [['carnet', 'nombre', 'clave_temporal']];
        let creadas = 0;
        let omitidas = 0;
        for (const p of datos.personas) {
          const usuario = exigirCarnet(p.usuario ?? p.ci);
          if (await almacen.existe(usuario)) { omitidas += 1; continue; }
          const clave = p.clave_temporal ?? claveTemporal();
          const nombres = (p.nombres ?? '').trim() || usuario;
          const apellidos = (p.apellidos ?? '').trim();
          await almacen.guardarPersona({ usuario, nombres, apellidos, claveHash: await cifrarClave(clave), cambiarClave: true, activo: true });
          filas.push([usuario.toUpperCase(), nombreCompleto({ nombres, apellidos }), clave]);
          creadas += 1;
        }
        const salida = values.salida ?? `credenciales-temporales-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.csv`;
        if (creadas > 0) escribirPrivado(salida, csv(filas));
        console.log(`Creadas: ${creadas} · ya existían: ${omitidas}.${creadas > 0 ? ` Claves temporales en ${salida} (600): entréguelas en persona y BORRE el archivo.` : ''}`);
        return 0;
      }
      case 'crear': {
        const usuario = exigirCarnet(args[0]);
        if (!args[1]) { console.log('Uso: node src/admin.ts crear <carnet> <nombres> <apellidos>'); return 2; }
        if (await almacen.existe(usuario)) { console.log(`${usuario.toUpperCase()} ya existe. Para darle otra clave: clave ${usuario}`); return 1; }
        const clave = claveTemporal();
        await almacen.guardarPersona({ usuario, nombres: args[1], apellidos: args.slice(2).join(' '), claveHash: await cifrarClave(clave), cambiarClave: true, activo: true });
        console.log(`Creada ${usuario.toUpperCase()}. Clave temporal: ${clave} (la cambiará al entrar).`);
        return 0;
      }
      case 'clave': {
        const usuario = exigirCarnet(args[0]);
        const p = await almacen.persona(usuario);
        if (!p) { console.log(`${usuario.toUpperCase()} no existe.`); return 1; }
        const clave = claveTemporal();
        await almacen.guardarPersona({ ...p, claveHash: await cifrarClave(clave), cambiarClave: true });
        await almacen.limpiarIntentos(usuario);
        console.log(`Nueva clave temporal de ${usuario.toUpperCase()}: ${clave} (la cambiará al entrar).`);
        return 0;
      }
      case 'desactivar':
      case 'activar': {
        const usuario = exigirCarnet(args[0]);
        const p = await almacen.persona(usuario);
        if (!p) { console.log(`${usuario.toUpperCase()} no existe.`); return 1; }
        await almacen.guardarPersona({ ...p, activo: comando === 'activar' });
        console.log(`${usuario.toUpperCase()} ${comando === 'activar' ? 'activada' : 'desactivada'}.`);
        return 0;
      }
      case 'desbloquear': {
        const usuario = exigirCarnet(args[0]);
        await almacen.limpiarIntentos(usuario);
        console.log(`${usuario.toUpperCase()} desbloqueada.`);
        return 0;
      }
      case 'listar': {
        const personas = await almacen.listar();
        for (const p of personas) console.log(`${p.usuario.toUpperCase().padEnd(14)} ${nombreCompleto(p).padEnd(40)} ${p.activo ? 'activa' : 'INACTIVA'}${p.cambiarClave ? ' · clave temporal' : ''}`);
        console.log(`Total: ${personas.length}`);
        return 0;
      }
      default:
        console.log(`Comando desconocido: ${comando}\n\n${AYUDA}`);
        return 2;
    }
  } finally {
    await almacen.cerrar();
  }
};

if (import.meta.main) {
  try {
    process.exitCode = await principal(process.argv.slice(2));
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
    process.exitCode = 1;
  }
}
