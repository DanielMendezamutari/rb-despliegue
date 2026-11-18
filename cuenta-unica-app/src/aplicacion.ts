import type { IncomingMessage, ServerResponse } from 'node:http';
import type Provider from 'oidc-provider';
import type { Almacen } from './almacen.ts';
import { cifrarClave, verificarClave } from './claves.ts';
import type { Configuracion } from './config.ts';
import { paginaCambioClave, paginaError, paginaIngreso } from './paginas.ts';
import { estaBloqueado, normalizarUsuario, problemaClaveNueva } from './personas.ts';
import { RUTA_INTERACCION } from './proveedor.ts';

const MENSAJE_INGRESO = 'Carnet o clave incorrectos, o el acceso está bloqueado por varios intentos. Espere 15 minutos o pida ayuda.';
const LIMITE_CUERPO = 8 * 1024;

const ahora = (): number => Math.floor(Date.now() / 1000);

const leerFormulario = async (req: IncomingMessage): Promise<URLSearchParams> => {
  let texto = '';
  for await (const parte of req) {
    texto += String(parte);
    if (texto.length > LIMITE_CUERPO) throw new Error('Formulario demasiado grande.');
  }
  return new URLSearchParams(texto);
};

const enviarHtml = (res: ServerResponse, estado: number, html: string): void => {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
};

/**
 * Manejador HTTP: cabeceras de seguridad, pantallas de ingreso/cambio de clave y el resto a oidc-provider, que vive
 * montado bajo la ruta del emisor (`/realms/riberbulma`), como Keycloak.
 */
export const crearAplicacion = (config: Configuracion, almacen: Almacen, proveedor: Provider) => {
  const prefijo = new URL(config.emisor).pathname;
  const marcos = ["'self'", ...config.marcos].join(' ');
  const delProveedor = proveedor.callback();
  const portal = config.clientes.find((c) => c.id === 'portal')?.salidas?.[0] ?? null;
  const VENCIO = 'La pantalla de ingreso venció (dura 15 minutos y sirve una sola vez).';

  const interaccion = async (req: IncomingMessage, res: ServerResponse, uid: string, paso: string): Promise<void> => {
    const detalles = await proveedor.interactionDetails(req, res);
    if (detalles.uid !== uid) {
      console.error(`[cuenta-unica] interacción ${paso || 'ver'}: uid de la cookie distinto al de la dirección`);
      enviarHtml(res, 400, paginaError(VENCIO, portal));
      return;
    }
    const base = `${prefijo}${RUTA_INTERACCION}/${uid}`;

    if (detalles.prompt.name === 'consent') {
      // No debería pasar (loadExistingGrant da el permiso); por si acaso, se concede lo pedido.
      const grant = new proveedor.Grant({ clientId: String(detalles.params['client_id']), accountId: String(detalles.session?.accountId) });
      grant.addOIDCScope('openid');
      grant.addOIDCClaims(['preferred_username', 'name', 'given_name', 'family_name']);
      await proveedor.interactionFinished(req, res, { consent: { grantId: await grant.save() } }, { mergeWithLastSubmission: true });
      return;
    }

    if (req.method === 'GET') {
      const pendiente = await almacen.pendiente(uid, ahora());
      enviarHtml(res, 200, pendiente ? paginaCambioClave(`${base}/clave`, null) : paginaIngreso(`${base}/ingresar`, '', null));
      return;
    }

    const formulario = await leerFormulario(req);
    if (paso === 'ingresar') {
      const escrito = formulario.get('usuario') ?? '';
      const usuario = normalizarUsuario(escrito);
      const clave = formulario.get('clave') ?? '';
      const persona = usuario ? await almacen.persona(usuario) : null;
      const intentos = usuario ? await almacen.intentos(usuario) : { fallos: 0, ultimoFallo: null };
      // Siempre se calcula scrypt (aunque el carnet no exista o esté bloqueado): mismo tiempo de respuesta.
      const claveBien = await verificarClave(clave, persona?.claveHash ?? null);
      const bloqueado = estaBloqueado(intentos.fallos, intentos.ultimoFallo, ahora());
      if (!usuario || !persona || !persona.activo || bloqueado || !claveBien) {
        if (usuario && !bloqueado) await almacen.registrarFallo(usuario, ahora());
        enviarHtml(res, 200, paginaIngreso(`${base}/ingresar`, escrito, MENSAJE_INGRESO));
        return;
      }
      await almacen.limpiarIntentos(usuario);
      if (persona.cambiarClave) {
        await almacen.guardarPendiente(uid, usuario, ahora() + 15 * 60);
        enviarHtml(res, 200, paginaCambioClave(`${base}/clave`, null));
        return;
      }
      await proveedor.interactionFinished(req, res, { login: { accountId: usuario } }, { mergeWithLastSubmission: false });
      return;
    }

    if (paso === 'clave') {
      const usuario = await almacen.pendiente(uid, ahora());
      const persona = usuario ? await almacen.persona(usuario) : null;
      if (!usuario || !persona || !persona.activo) { enviarHtml(res, 200, paginaIngreso(`${base}/ingresar`, '', 'Vuelva a ingresar su carnet y clave.')); return; }
      const nueva = formulario.get('nueva') ?? '';
      const problema = problemaClaveNueva(nueva, formulario.get('repetida') ?? '', usuario);
      if (problema) { enviarHtml(res, 200, paginaCambioClave(`${base}/clave`, problema)); return; }
      if (await verificarClave(nueva, persona.claveHash)) { enviarHtml(res, 200, paginaCambioClave(`${base}/clave`, 'Elija una clave distinta de la temporal.')); return; }
      await almacen.guardarPersona({ ...persona, claveHash: await cifrarClave(nueva), cambiarClave: false });
      await almacen.borrarPendiente(uid);
      await proveedor.interactionFinished(req, res, { login: { accountId: usuario } }, { mergeWithLastSubmission: false });
      return;
    }
    enviarHtml(res, 404, paginaError('Página no encontrada.'));
  };

  const emisorSeguro = config.emisor.startsWith('https://');

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // En el hosting Apache termina el HTTPS y Passenger entrega HTTP: si no llegó la cabecera, el emisor manda.
    if (emisorSeguro && !req.headers['x-forwarded-proto']) req.headers['x-forwarded-proto'] = 'https';
    res.setHeader('Content-Security-Policy', `frame-ancestors ${marcos}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000');

    const url = req.url ?? '/';
    const ruta = url.split('?')[0] ?? '/';
    if (ruta === '/' || ruta === '/salud') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('cuenta única: en servicio\n');
      return;
    }
    if (!ruta.startsWith(`${prefijo}/`)) { enviarHtml(res, 404, paginaError('Página no encontrada.')); return; }

    const interno = ruta.slice(prefijo.length);
    const coincide = new RegExp(`^${RUTA_INTERACCION}/([A-Za-z0-9_-]{10,64})(?:/(ingresar|clave))?$`).exec(interno);
    if (coincide?.[1]) {
      try {
        await interaccion(req, res, coincide[1], coincide[2] ?? '');
      } catch (e) {
        const nombre = e instanceof Error ? e.name : '';
        if (!res.headersSent) enviarHtml(res, 400, paginaError(nombre === 'SessionNotFound' ? VENCIO : 'No se pudo completar el ingreso.', portal));
        // Diagnóstico sin datos personales: paso, tipo de error, su mensaje y si llegó la cookie de la interacción.
        const conCookie = /(?:^|;\s*)_interaction=/.test(req.headers.cookie ?? '');
        console.error(`[cuenta-unica] interacción ${coincide[2] ?? 'ver'}: ${nombre} · ${e instanceof Error ? e.message : ''} · cookie=${conCookie ? 'sí' : 'no'}`);
      }
      return;
    }

    // oidc-provider montado bajo el prefijo (como hace express: originalUrl completo, url sin prefijo).
    const conOriginal = req as IncomingMessage & { originalUrl?: string };
    conOriginal.originalUrl = url;
    req.url = url.slice(prefijo.length) || '/';
    await delProveedor(req, res);
  };
};
