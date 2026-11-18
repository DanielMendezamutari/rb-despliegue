import { randomBytes } from 'node:crypto';
import Provider, { type Adapter, type AdapterPayload, type Configuration, type KoaContextWithOIDC } from 'oidc-provider';
import type { Almacen } from './almacen.ts';
import type { Configuracion } from './config.ts';
import { paginaError, paginaSalidaLista, paginaSalir } from './paginas.ts';
import { nombreCompleto, vidaSesion } from './personas.ts';

/** Rutas de Keycloak: los sistemas ya llaman a `{emisor}/protocol/openid-connect/...` (no se tocan). */
export const RUTAS = {
  authorization: '/protocol/openid-connect/auth',
  token: '/protocol/openid-connect/token',
  userinfo: '/protocol/openid-connect/userinfo',
  jwks: '/protocol/openid-connect/certs',
  end_session: '/protocol/openid-connect/logout',
  revocation: '/protocol/openid-connect/revoke',
  introspection: '/protocol/openid-connect/token/introspect',
} as const;

export const RUTA_INTERACCION = '/interaccion';

const ahora = (): number => Math.floor(Date.now() / 1000);

/** Adaptador de oidc-provider sobre el almacén (memoria o MariaDB). */
const adaptador = (almacen: Almacen) => (modelo: string): Adapter => ({
  upsert: async (id, carga, venceEn) => {
    await almacen.oidcGuardar(modelo, id, { ...carga }, venceEn ? ahora() + venceEn : null);
  },
  find: async (id) => (await almacen.oidcBuscar(modelo, id, ahora())) as AdapterPayload | null ?? undefined,
  findByUid: async (uid) => (await almacen.oidcBuscarPor(modelo, 'uid', uid, ahora())) as AdapterPayload | null ?? undefined,
  findByUserCode: async (codigo) => (await almacen.oidcBuscarPor(modelo, 'userCode', codigo, ahora())) as AdapterPayload | null ?? undefined,
  consume: async (id) => { await almacen.oidcConsumir(modelo, id, ahora()); },
  destroy: async (id) => { await almacen.oidcBorrar(modelo, id); },
  revokeByGrantId: async (grantId) => { await almacen.oidcRevocarGrant(grantId); },
});

export const crearProveedor = (config: Configuracion, almacen: Almacen): Provider => {
  const prefijo = new URL(config.emisor).pathname;
  const configuracion: Configuration = {
    adapter: adaptador(almacen),
    clients: config.clientes.map((c) => ({
      client_id: c.id,
      client_name: c.nombre,
      ...(c.secreto ? { client_secret: c.secreto, token_endpoint_auth_method: 'client_secret_post' } : { token_endpoint_auth_method: 'none' }),
      redirect_uris: [...c.retornos],
      post_logout_redirect_uris: [...(c.salidas ?? [])],
      grant_types: ['authorization_code'],
      response_types: ['code'],
    })),
    jwks: { keys: config.jwks.keys.map((k) => ({ ...k })) },
    cookies: {
      keys: [...config.cookies],
      long: { httpOnly: true, sameSite: 'lax' },
      short: { httpOnly: true, sameSite: 'lax' },
    },
    // El carnet viaja como `preferred_username` (lo leen los 4 sistemas y el portal), también en el id_token.
    claims: { openid: ['sub', 'preferred_username', 'name', 'given_name', 'family_name'] },
    conformIdTokenClaims: false,
    findAccount: async (_ctx, sub) => {
      const p = await almacen.persona(sub);
      if (!p || !p.activo) return undefined;
      return {
        accountId: p.usuario,
        claims: () => ({ sub: p.usuario, preferred_username: p.usuario, name: nombreCompleto(p), given_name: p.nombres, family_name: p.apellidos }),
      };
    },
    // Sistemas propios: el permiso (grant) se da solo, sin pantalla de consentimiento.
    loadExistingGrant: async (ctx: KoaContextWithOIDC) => {
      const { session, client } = ctx.oidc;
      if (!session?.accountId || !client) return undefined;
      const grantId = ctx.oidc.result?.consent?.grantId ?? session.grantIdFor(client.clientId);
      if (grantId) {
        const existente = await ctx.oidc.provider.Grant.find(grantId);
        if (existente) return existente;
      }
      const grant = new ctx.oidc.provider.Grant({ clientId: client.clientId, accountId: session.accountId });
      grant.addOIDCScope('openid');
      grant.addOIDCClaims(['preferred_username', 'name', 'given_name', 'family_name']);
      await grant.save();
      return grant;
    },
    interactions: { url: async (_ctx, interaccion) => `${prefijo}${RUTA_INTERACCION}/${interaccion.uid}` },
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      rpInitiatedLogout: {
        enabled: true,
        logoutSource: async (ctx, formulario) => {
          const nonce = randomBytes(16).toString('base64');
          ctx.set('Content-Security-Policy', `script-src 'nonce-${nonce}'`);
          ctx.type = 'html';
          ctx.body = paginaSalir(formulario, nonce);
        },
        postLogoutSuccessSource: async (ctx) => {
          ctx.type = 'html';
          ctx.body = paginaSalidaLista();
        },
      },
    },
    // CORS solo para el portal (cliente público): su origen debe ser el de alguno de sus retornos.
    clientBasedCORS: (_ctx, origen, cliente) =>
      cliente.clientAuthMethod === 'none' && (cliente.redirectUris ?? []).some((u) => URL.parse(u)?.origin === origen),
    pkce: { required: (_ctx, client) => client.clientAuthMethod === 'none' },
    responseTypes: ['code'],
    routes: { ...RUTAS },
    ttl: {
      AccessToken: 5 * 60,
      AuthorizationCode: 60,
      IdToken: 5 * 60,
      Interaction: 15 * 60,
      Grant: 8 * 60 * 60,
      Session: (_ctx, sesion) => vidaSesion(sesion.loginTs, ahora()),
    },
    renderError: async (ctx, salida) => {
      ctx.type = 'html';
      const texto = salida.error === 'invalid_request' || salida.error === 'invalid_client' || salida.error === 'invalid_redirect_uri'
        ? 'El sistema que lo envió no está bien configurado para la cuenta única.'
        : 'La solicitud venció o no es válida.';
      ctx.body = paginaError(texto);
    },
  };
  const proveedor = new Provider(config.emisor, configuracion);
  proveedor.proxy = true; // detrás de Apache/Passenger: respeta X-Forwarded-Proto (https).
  return proveedor;
};
