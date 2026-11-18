// Pantallas de la cuenta única (HTML del servidor, sin JavaScript salvo el envío automático al salir).

const escapar = (t: string): string =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const ESTILO = `
:root{color-scheme:light dark;--fondo:#f4f5f7;--tarjeta:#fff;--texto:#1d2330;--suave:#5b6475;--borde:#d5d9e0;--marca:#c8102e;--error:#b42318}
@media (prefers-color-scheme:dark){:root{--fondo:#12151b;--tarjeta:#1b2029;--texto:#eef0f4;--suave:#a3abba;--borde:#343b48;--marca:#ff4d63;--error:#ff7b70}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--fondo);color:var(--texto);
font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px}
main{width:100%;max-width:380px;background:var(--tarjeta);border:1px solid var(--borde);border-radius:12px;padding:28px 24px}
h1{font-size:1.3rem;margin:0 0 4px}p{margin:0 0 16px;color:var(--suave)}label{display:block;font-weight:600;margin:14px 0 6px}
input{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--borde);border-radius:8px;background:transparent;color:inherit}
input:focus{outline:2px solid var(--marca);outline-offset:1px}
button{margin-top:20px;width:100%;font:inherit;font-weight:600;padding:11px;border:0;border-radius:8px;background:var(--marca);color:#fff;cursor:pointer}
.error{color:var(--error);background:color-mix(in srgb,var(--error) 10%,transparent);border-radius:8px;padding:10px 12px;margin:0 0 8px}
.marca{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--marca);font-weight:700;margin-bottom:12px}`;

const pagina = (titulo: string, cuerpo: string): string => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escapar(titulo)} · Cuenta única</title><style>${ESTILO}</style></head>
<body><main><div class="marca">Riber Bulma · Cuenta única</div>${cuerpo}</main></body></html>`;

const aviso = (error: string | null): string => (error ? `<p class="error" role="alert">${escapar(error)}</p>` : '');

export const paginaIngreso = (accion: string, usuario: string, error: string | null): string => pagina('Ingresar', `
<h1>Ingresar</h1><p>Con su carnet de identidad y su clave.</p>${aviso(error)}
<form method="post" action="${escapar(accion)}" autocomplete="on">
<label for="usuario">Carnet</label>
<input id="usuario" name="usuario" value="${escapar(usuario)}" autocomplete="username" inputmode="text" autocapitalize="off" required autofocus placeholder="Ej.: 7788990 o 7788990-1B">
<label for="clave">Clave</label>
<input id="clave" name="clave" type="password" autocomplete="current-password" required>
<button type="submit">Ingresar</button></form>`);

export const paginaCambioClave = (accion: string, error: string | null): string => pagina('Cambiar clave', `
<h1>Cree su clave</h1><p>Es su primer ingreso o le dieron una clave temporal. Elija una clave nueva:
al menos 10 caracteres, con letras y números, sin su carnet.</p>${aviso(error)}
<form method="post" action="${escapar(accion)}">
<label for="nueva">Clave nueva</label>
<input id="nueva" name="nueva" type="password" autocomplete="new-password" minlength="10" required autofocus>
<label for="repetida">Repita la clave nueva</label>
<input id="repetida" name="repetida" type="password" autocomplete="new-password" minlength="10" required>
<button type="submit">Guardar y continuar</button></form>`);

export const paginaError = (mensaje: string): string => pagina('Aviso', `<h1>No se pudo continuar</h1><p>${escapar(mensaje)}</p>
<p>Vuelva a abrir el sistema e intente de nuevo.</p>`);

export const paginaSalidaLista = (): string => pagina('Sesión cerrada', '<h1>Sesión cerrada</h1><p>Ya puede cerrar esta ventana.</p>');

/** Salida sin preguntar: el formulario que arma oidc-provider se envía solo con logout=yes. */
export const paginaSalir = (formulario: string, nonce: string): string => pagina('Saliendo', `<h1>Cerrando sesión…</h1>${formulario}
<script nonce="${escapar(nonce)}">var f=document.forms[0];var i=document.createElement('input');i.type='hidden';i.name='logout';i.value='yes';f.appendChild(i);f.submit();</script>`);
