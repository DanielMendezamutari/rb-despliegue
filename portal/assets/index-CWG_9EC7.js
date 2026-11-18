(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={captacion:{id:`captacion`,nombre:`Captación`,abreviatura:`Ca`,color:`#2e7d6b`,orden:1},cobros:{id:`cobros`,nombre:`Cobros`,abreviatura:`Co`,color:`#3d5a99`,orden:2},seguimiento:{id:`seguimiento`,nombre:`Seguimiento`,abreviatura:`Se`,color:`#7a4e8c`,orden:3},"panel-web":{id:`panel-web`,nombre:`Panel web`,abreviatura:`Pw`,color:`#9a5b2e`,orden:4}},t=Object.values(e).sort((e,t)=>e.orden-t.orden),n=t=>typeof t==`string`&&Object.hasOwn(e,t),r=t=>e[t],i=t=>[...t].sort((t,n)=>e[t.id].orden-e[n.id].orden),a=e=>{console.warn(`[barra-comun] ${e}`)},o=e=>typeof e==`object`&&!!e&&!Array.isArray(e),s=e=>typeof e==`string`&&e.trim().length>0?e.trim():null,c=e=>typeof e==`string`&&(/^https?:\/\/\S+$/i.test(e)||/^\/\S*$/.test(e)),l=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/,u=e=>{if(e==null)return;if(!o(e)||typeof e.numero!=`string`||!/^\d{4,12}$/.test(e.numero)){a(`El CI no es válido (4 a 12 dígitos); se muestra la cuenta sin CI.`);return}let t=e.complemento;if(t==null||t===``)return{numero:e.numero};if(typeof t!=`string`||!/^[0-9A-Za-z]{1,4}$/.test(t))a(`El complemento del CI no es válido (1 a 4 letras o dígitos); se muestra la cuenta sin CI.`);else return{numero:e.numero,complemento:t.toLocaleUpperCase(`es`)}},d=e=>{if(!Array.isArray(e))return e!==void 0&&a(`"sistemas" debe ser una lista; se usa una lista vacía.`),[];let t=new Set,r=[];for(let i of e){if(!o(i)||!n(i.id)){a(`Sistema desconocido ignorado: ${JSON.stringify(o(i)?i.id:i)}.`);continue}let e=s(i.cargo);e===null||!c(i.url)?a(`Sistema "${i.id}" ignorado: necesita cargo y una dirección válida.`):t.has(i.id)?a(`Sistema "${i.id}" repetido; se usa el primero.`):(t.add(i.id),r.push({id:i.id,cargo:e,url:i.url}))}return r},f=e=>{if(e==null)return null;if(!o(e))return a(`"persona" debe ser un objeto o null.`),null;let t=s(e.nombre);if(t===null)return a(`La persona no tiene nombre; la barra se muestra sin sesión.`),null;let n=u(e.ci),r=d(e.sistemas);return n?{nombre:t,ci:n,sistemas:r}:{nombre:t,sistemas:r}},p=e=>{if(e==null)return[];if(!Array.isArray(e))return a(`"avisos" debe ser una lista; se usa una lista vacía.`),[];let t=new Set,r=[];for(let i of e){if(!o(i)){a(`Aviso ignorado: no es un objeto.`);continue}let e=s(i.id),u=s(i.texto),d=typeof i.fecha==`string`&&l.test(i.fecha)&&!Number.isNaN(Date.parse(i.fecha))?i.fecha:null,f=i.url===void 0||c(i.url);if(e===null||u===null||!n(i.sistema)||d===null||!f){a(`Aviso ignorado ${e===null?`(sin id)`:`"${e}"`}: necesita id, texto, sistema conocido, fecha ISO 8601 con zona y dirección válida.`);continue}if(t.has(e)){a(`Aviso "${e}" repetido; se usa el primero.`);continue}t.add(e);let p={id:e,texto:u,sistema:i.sistema,fecha:d};r.push(typeof i.url==`string`?{...p,url:i.url}:p)}return r},m=`
/* !important: un CSS global del anfitrión (p. ej. "* { all: revert }") le gana a :host normal (hallazgo B-1). */
:host {
  all: initial;
  display: block !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: auto !important;
  width: auto !important;
  margin: 0 !important;
  z-index: 1000 !important;
  height: calc(56px + env(safe-area-inset-top, 0px)) !important;
}
:host([hidden]) { display: none !important; }
@media print { :host { display: none !important; } }
.oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.raiz {
  --bc-barra: #0b0b0b;
  --bc-barra-texto: #f3eedf;
  --bc-barra-suave: #a39c8c;
  --bc-barra-hover: rgba(243, 238, 223, 0.12);
  --bc-dorado: #d4af37;
  --bc-panel: #ffffff;
  --bc-panel-texto: #16140f;
  --bc-panel-suave: #6b655a;
  --bc-panel-borde: #e0d9c8;
  --bc-panel-hover: rgba(22, 20, 15, 0.06);
  --bc-peligro: #b3261e;
  --bc-titulo: Sora, "Segoe UI", system-ui, sans-serif;
  --bc-texto: Manrope, "Segoe UI", system-ui, sans-serif;
  box-sizing: border-box;
  height: 100%;
  padding-top: env(safe-area-inset-top, 0px);
  padding-left: max(8px, env(safe-area-inset-left, 0px));
  padding-right: max(8px, env(safe-area-inset-right, 0px));
  background: var(--bc-barra);
  color: var(--bc-barra-texto);
  font-family: var(--bc-texto);
  font-size: 15px;
  line-height: 1.4;
  font-weight: 400;
  font-style: normal;
  text-transform: none;
  letter-spacing: normal;
  text-align: left;
  white-space: normal;
  visibility: visible;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  color-scheme: light;
}
.raiz.oscuro {
  --bc-barra: #040404;
  --bc-barra-suave: #9c9585;
  --bc-panel: #1f1d19;
  --bc-panel-texto: #f1ece0;
  --bc-panel-suave: #a8a192;
  --bc-panel-borde: #34312a;
  --bc-panel-hover: rgba(241, 236, 224, 0.08);
  --bc-peligro: #f2897f;
  color-scheme: dark;
}
*, *::before, *::after { box-sizing: border-box; }
button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  margin: 0;
  padding: 0;
  cursor: pointer;
  text-transform: none;
  letter-spacing: normal;
}
:focus-visible { outline: 2px solid var(--bc-dorado); outline-offset: 2px; }
p { margin: 0; }

.fila { position: relative; display: flex; align-items: center; gap: 4px; height: 56px; }
.boton-icono {
  position: relative;
  flex: none;
  min-width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}
.boton-icono:hover, .boton-icono[aria-expanded="true"] { background: var(--bc-barra-hover); }
.marca {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  gap: 9px;
  height: 44px;
  padding: 0 8px;
  border-radius: 10px;
  font-family: var(--bc-titulo);
  font-weight: 700;
  font-size: 16px;
}
.marca:hover { background: var(--bc-barra-hover); }
.rombo { flex: none; width: 13px; height: 13px; background: var(--bc-dorado); transform: rotate(45deg); border-radius: 2px; }
.sistema-actual {
  flex: 0 1 auto;
  min-width: 0;
  color: var(--bc-barra-suave);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sistema-actual b { color: var(--bc-barra-texto); font-weight: 600; }
.espacio { flex: 1 1 0; min-width: 0; }
.contador {
  position: absolute;
  top: 4px;
  right: 2px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--bc-dorado);
  color: #0b0b0b;
  font-size: 11px;
  font-weight: 700;
  line-height: 17px;
  text-align: center;
}
.iniciales {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bc-dorado);
  color: #0b0b0b;
  font-weight: 700;
  font-size: 13px;
  display: grid;
  place-items: center;
}

.panel {
  position: absolute;
  top: calc(100% + 6px);
  z-index: 2;
  width: min(330px, calc(100vw - 24px));
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding: 12px;
  display: grid;
  gap: 10px;
  background: var(--bc-panel);
  color: var(--bc-panel-texto);
  border: 1px solid var(--bc-panel-borde);
  border-radius: 14px;
  box-shadow: 0 20px 44px -18px rgba(0, 0, 0, 0.45);
}
.panel.izquierda { left: 0; }
.panel.derecha { right: 0; }
.titulo-panel {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bc-panel-suave);
}
.pie, .vacio { font-size: 13px; color: var(--bc-panel-suave); }
.menu { display: grid; gap: 2px; }
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 6px 8px;
  border-radius: 10px;
  text-align: left;
}
.item:hover, .item:focus-visible { background: var(--bc-panel-hover); }
.item[aria-current="true"] { box-shadow: inset 0 0 0 1px var(--bc-dorado); }
.item.peligro { color: var(--bc-peligro); }
.icono-sistema {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-family: var(--bc-titulo);
  font-weight: 700;
  font-size: 12px;
}
.textos { display: grid; min-width: 0; }
.linea1 { font-weight: 600; font-size: 14px; }
.linea2, .linea1.recorte {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.linea2 { font-size: 12.5px; color: var(--bc-panel-suave); }
.aviso-texto {
  font-size: 14px;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cabecera-cuenta { display: grid; gap: 2px; min-width: 0; }
.cuenta-nombre {
  font-family: var(--bc-titulo);
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cuenta-ci { font-size: 13px; color: var(--bc-panel-suave); }
.cargos { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.cargo {
  max-width: 100%;
  padding: 1px 8px;
  border: 1px solid var(--bc-panel-borde);
  border-radius: 999px;
  font-size: 12px;
  color: var(--bc-panel-suave);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 419px) { .marca-texto { display: none; } }
`,h,ee=e=>{if(h===void 0)try{let e=new CSSStyleSheet;e.replaceSync(m),h=e}catch{h=null}if(h&&`adoptedStyleSheets`in e){e.adoptedStyleSheets=[h];return}let t=document.createElement(`style`);t.textContent=m,e.prepend(t)},g={ir:e=>{window.location.assign(e)}},te=[`sistemas`,`avisos`,`cuenta`],ne=e=>te.some(t=>t===e),re=(e,t)=>e===t?`ninguno`:t,ie=(e,t,n)=>{if(t<=0)return null;switch(n){case`ArrowDown`:return e<0?0:(e+1)%t;case`ArrowUp`:return e<0?t-1:(e-1+t)%t;case`Home`:return 0;case`End`:return t-1;default:return null}},ae=e=>e.complemento?`${e.numero}-${e.complemento.toLocaleUpperCase(`es`)}`:e.numero,_=e=>(Array.from(e??``)[0]??``).toLocaleUpperCase(`es`),oe=e=>{let t=e.trim().split(/\s+/).filter(e=>e.length>0);if(t.length===0)return``;if(t.length===1)return _(t[0]);let n=t.length>=4?t[2]:t[1];return _(t[0])+_(n)},v=6e4,y=60*v,se=24*y,b=e=>String(e).padStart(2,`0`),ce=(e,t)=>{let n=t.getTime()-e.getTime();return n<v?`hace un momento`:n<y?`hace ${Math.floor(n/v)} min`:n<se?`hace ${Math.floor(n/y)} h`:`${b(e.getDate())}/${b(e.getMonth()+1)}`},le=e=>e<=0?``:e>9?`9+`:String(e),ue=(e,t)=>`<rect x="${e}" y="${t}" width="4" height="4" rx="1" fill="currentColor"/>`,de=`<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${[1,8,15].flatMap(e=>[1,8,15].map(t=>ue(t,e))).join(``)}</svg>`,fe=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" fill="none"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" fill="none"/></svg>`,x={tituloSistemas:`Tus sistemas`,pieSistemas:`Solo aparecen los sistemas donde tienes cargo.`,tituloAvisos:`Tus avisos`,avisosVacio:`No tienes avisos`,cambiarClave:`Cambiar mi contraseña`,salir:`Salir`,prefijoCi:`CI`,marca:`Portal`,cambiarSistema:`Cambiar de sistema`,irInicio:`Ir al inicio`},S=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),C=(e,t,n,r)=>`<button type="button" class="boton-icono" data-accion="abrir" data-panel="${e}" data-clave="disparador-${e}" aria-haspopup="true" aria-expanded="${t}"><span class="oculto">${S(n)}</span>${r}</button>`,pe=e=>{let t=r(e);return`<span class="icono-sistema" style="background:${t.color}" aria-hidden="true">${t.abreviatura}</span>`},me=(e,t)=>{let n=i(e.sistemas).map(e=>{let n=e.id===t;return`<button type="button" class="item" role="menuitem" tabindex="-1" data-accion="ir-sistema" data-id="${e.id}" data-clave="sistema-${e.id}"${n?` aria-current="true"`:``}>${pe(e.id)}<span class="textos"><span class="linea1">${S(r(e.id).nombre)}</span><span class="linea2">${S(e.cargo)}</span></span></button>`}).join(``);return`<div class="panel izquierda" data-panel-abierto="sistemas"><p class="titulo-panel" id="bc-titulo-sistemas">${x.tituloSistemas}</p>`+(n?`<div class="menu" role="menu" aria-labelledby="bc-titulo-sistemas">${n}</div>`:``)+`<p class="pie">${x.pieSistemas}</p></div>`},he=(e,t)=>{let n=e.map(e=>`<button type="button" class="item" role="menuitem" tabindex="-1" data-accion="aviso" data-id="${S(e.id)}" data-clave="aviso-${S(e.id)}">${pe(e.sistema)}<span class="textos"><span class="aviso-texto">${S(e.texto)}</span><span class="linea2">${S(r(e.sistema).nombre)} · ${ce(new Date(e.fecha),t)}</span></span></button>`).join(``);return`<div class="panel derecha" data-panel-abierto="avisos"><p class="titulo-panel" id="bc-titulo-avisos">${x.tituloAvisos}</p>`+(n?`<div class="menu" role="menu" aria-labelledby="bc-titulo-avisos">${n}</div>`:`<p class="vacio">${x.avisosVacio}</p>`)+`</div>`},ge=e=>{let t=i(e.sistemas).map(e=>`<span class="cargo">${S(r(e.id).nombre)}: ${S(e.cargo)}</span>`).join(``);return`<div class="panel derecha" data-panel-abierto="cuenta"><div class="cabecera-cuenta"><p class="cuenta-nombre" id="bc-titulo-cuenta">${S(e.nombre)}</p>`+(e.ci?`<p class="cuenta-ci">${x.prefijoCi} ${S(ae(e.ci))}</p>`:``)+(t?`<div class="cargos">${t}</div>`:``)+`</div><div class="menu" role="menu" aria-labelledby="bc-titulo-cuenta"><button type="button" class="item" role="menuitem" tabindex="-1" data-accion="cambiar-clave" data-clave="cambiar-clave">${x.cambiarClave}</button><button type="button" class="item peligro" role="menuitem" tabindex="-1" data-accion="salir" data-clave="salir">${x.salir}</button></div></div>`},_e=e=>{let t=e.persona,n=e.sistemaActual?r(e.sistemaActual).nombre:null,i=e.avisos.length,a=[t?C(`sistemas`,e.panel===`sistemas`,x.cambiarSistema,de):``,`<button type="button" class="marca" data-accion="inicio" data-clave="inicio"><span class="oculto">${x.irInicio}</span><span class="rombo" aria-hidden="true"></span><span class="marca-texto" aria-hidden="true">${x.marca}</span></button>`,n?`<span class="sistema-actual">/ <b>${S(n)}</b></span>`:``,`<span class="espacio"></span>`,t?C(`avisos`,e.panel===`avisos`,i?`Avisos (${i})`:`Avisos, ninguno`,fe+(i?`<span class="contador" aria-hidden="true">${le(i)}</span>`:``)):``,t?C(`cuenta`,e.panel===`cuenta`,`Mi cuenta: ${t.nombre}`,`<span class="iniciales" aria-hidden="true">${S(oe(t.nombre))}</span>`):``,t&&e.panel===`sistemas`?me(t,e.sistemaActual):``,t&&e.panel===`avisos`?he(e.avisos,e.ahora):``,t&&e.panel===`cuenta`?ge(t):``];return`<div class="raiz ${e.modo}"><div class="fila">${a.join(``)}</div></div>`},ve=[`claro`,`oscuro`,`auto`],ye=6e4,be=class extends HTMLElement{static{this.observedAttributes=[`sistema-actual`,`tema`,`url-inicio`]}#e;#t=null;#n=[];#r=`ninguno`;#i=null;#a=null;#o=!1;constructor(){super(),this.#e=this.attachShadow({mode:`open`}),ee(this.#e),this.#e.addEventListener(`pointerdown`,()=>{this.#o=!0}),this.#e.addEventListener(`click`,this.#h),this.#e.addEventListener(`keydown`,this.#g),this.#e.addEventListener(`focusout`,this.#_)}connectedCallback(){for(let e of[`persona`,`avisos`])if(Object.hasOwn(this,e)){let t=Reflect.get(this,e);Reflect.deleteProperty(this,e),Reflect.set(this,e,t)}this.#i=typeof matchMedia==`function`?matchMedia(`(prefers-color-scheme: dark)`):null,this.#i?.addEventListener(`change`,this.#c),document.addEventListener(`pointerdown`,this.#v,!0),this.#c()}disconnectedCallback(){this.#i?.removeEventListener(`change`,this.#c),document.removeEventListener(`pointerdown`,this.#v,!0),this.#f()}attributeChangedCallback(){this.isConnected&&this.#c()}get persona(){return this.#t}set persona(e){this.#t=f(e),this.#t||this.#d(`ninguno`),this.#c()}get avisos(){return[...this.#n]}set avisos(e){this.#n=p(e),this.#c()}get sistemaActual(){let e=this.getAttribute(`sistema-actual`);return n(e)?e:null}set sistemaActual(e){e===null?this.removeAttribute(`sistema-actual`):this.setAttribute(`sistema-actual`,e)}get tema(){let e=this.getAttribute(`tema`);return ve.find(t=>t===e)??`auto`}set tema(e){this.setAttribute(`tema`,e)}get urlInicio(){return this.getAttribute(`url-inicio`)||`/`}set urlInicio(e){this.setAttribute(`url-inicio`,e)}#s(){return this.tema===`auto`?this.#i?.matches?`oscuro`:`claro`:this.tema}#c=()=>{if(!this.isConnected)return;let e=this.#e.activeElement,t=e instanceof HTMLElement?e.dataset.clave:void 0,n=_e({modo:this.#s(),persona:this.#t,avisos:this.#n,sistemaActual:this.sistemaActual,panel:this.#r,ahora:new Date}),r=this.#e.querySelector(`style`);this.#e.innerHTML=n,r&&this.#e.prepend(r),t&&this.#l(`[data-clave="${CSS.escape(t)}"]`)};#l(e){this.#e.querySelector(e)?.focus()}#u(){return[...this.#e.querySelectorAll(`[role="menuitem"]`)]}#d(e){this.#r=e,this.#f(),e===`avisos`&&(this.#a=setInterval(this.#c,ye))}#f(){this.#a!==null&&clearInterval(this.#a),this.#a=null}#p(e){let t=this.#r;t!==`ninguno`&&(this.#d(`ninguno`),this.#c(),e&&this.#l(`[data-clave="disparador-${t}"]`))}#m(e,t,n){return this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0,cancelable:n}))}#h=e=>{this.#o=!1;let t=e.target instanceof Element?e.target.closest(`[data-accion]`):null;if(!t)return;let{accion:r,panel:i,id:a}=t.dataset;if(r===`abrir`&&ne(i))this.#d(re(this.#r,i)),this.#c(),this.#r!==`ninguno`&&this.#u()[0]?.focus();else if(r===`inicio`){this.#p(!1);let e=this.urlInicio;this.#m(`barra-inicio`,{url:e},!0)&&g.ir(e)}else if(r===`ir-sistema`&&n(a)){let e=this.#t?.sistemas.find(e=>e.id===a);if(this.#p(!0),!e||a===this.sistemaActual)return;this.#m(`barra-sistema`,{sistema:a,url:e.url},!0)&&g.ir(e.url)}else if(r===`aviso`){let e=this.#n.find(e=>e.id===a);if(this.#p(!0),!e)return;this.#m(`barra-aviso`,{aviso:{...e}},!0)&&e.url&&g.ir(e.url)}else(r===`cambiar-clave`||r===`salir`)&&(this.#p(!0),this.#m(r===`salir`?`barra-salir`:`barra-cambiar-clave`,null,!1))};#g=e=>{if(!(e instanceof KeyboardEvent)||this.#r===`ninguno`)return;if(e.key===`Escape`){e.preventDefault(),this.#p(!0);return}let t=this.#u(),n=ie(t.findIndex(e=>e===this.#e.activeElement),t.length,e.key);n!==null&&(e.preventDefault(),t[n]?.focus())};#_=e=>{if(this.#r===`ninguno`||!(e instanceof FocusEvent)||this.#o)return;let t=e.relatedTarget,n=this.#e.querySelector(`[data-panel-abierto]`),r=this.#e.querySelector(`[data-clave="disparador-${this.#r}"]`);t instanceof Node&&(n?.contains(t)||r===t)||t!==null&&this.#p(!1)};#v=e=>{e.composedPath().includes(this)||(this.#o=!1,this.#r!==`ninguno`&&this.#p(!1))}};typeof customElements<`u`&&!customElements.get(`barra-comun`)&&customElements.define(`barra-comun`,be);var w=`rb-puente/1`,xe=e=>typeof e==`object`&&!!e&&!Array.isArray(e),T=e=>typeof e==`string`&&e.length<=2e3&&/^\/(?!\/)/.test(e)&&![...e].some(e=>e===`\\`||e.charCodeAt(0)<32),Se=e=>{if(!xe(e)||e.protocolo!==`rb-puente/1`||!n(e.sistema))return!1;switch(e.tipo){case`listo`:case`sesion-cerrada`:return!0;case`avisos`:return Array.isArray(e.avisos);case`ruta`:return T(e.ruta);default:return!1}},E=(e,t,n)=>{let r=e[t];return typeof r==`string`&&r.trim()!==``?r.trim():n},D=(e,t,n,r)=>{let i=E(e,`VITE_${t}_URL`,n),a=E(e,`VITE_${t}_ENTRADA_UNICA`,r),o={url:i,origen:new URL(i).origin};return a===`-`||a===``?o:{...o,entradaUnica:a}},Ce=e=>({emisor:E(e,`VITE_CUENTA_UNICA_EMISOR`,`http://localhost:8080/realms/riberbulma`),cliente:E(e,`VITE_CUENTA_UNICA_CLIENTE`,`portal`),sistemas:{captacion:D(e,`CAPTACION`,`http://localhost:5180/`,`http://localhost:56321/functions/v1/cuenta-unica/iniciar`),cobros:D(e,`COBROS`,`http://localhost:5173/`,`http://localhost:5173/api/v1/auth/sso/iniciar`),seguimiento:D(e,`SEGUIMIENTO`,`http://localhost:3100/`,`http://localhost:3100/api/sso/iniciar`),"panel-web":D(e,`PANEL_WEB`,`http://localhost:3000/admin`,`http://localhost:3000/api/sso/iniciar`)}}),O=`portal-cuenta-unica-tramite`,k=`/callback`,A=e=>btoa(String.fromCharCode(...e)).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/,``),j=e=>A(crypto.getRandomValues(new Uint8Array(e))),we=async e=>A(new Uint8Array(await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(e)))),Te=e=>{let t=/^(\d{4,12})(?:-([0-9a-z]{1,4}))?$/i.exec(e.trim());if(t?.[1])return t[2]?{numero:t[1],complemento:t[2].toUpperCase()}:{numero:t[1]}},M=()=>`${window.location.origin}${k}`,Ee=()=>window.location.pathname===k,De=(e,t)=>{let n=()=>{let e=sessionStorage.getItem(O);if(sessionStorage.removeItem(O),!e)return null;try{let t=JSON.parse(e);if(typeof t!=`object`||!t)return null;let{estado:n,verificador:r,destino:i,silencioso:a}=t;if(typeof n==`string`&&typeof r==`string`&&typeof i==`string`)return{estado:n,verificador:r,destino:i,silencioso:a===!0}}catch{}return null};return{iniciar:async(n,r)=>{let i={estado:j(24),verificador:j(48),destino:n,silencioso:r};sessionStorage.setItem(O,JSON.stringify(i));let a=new URLSearchParams({client_id:t,response_type:`code`,scope:`openid profile`,redirect_uri:M(),state:i.estado,code_challenge:await we(i.verificador),code_challenge_method:`S256`});r&&a.set(`prompt`,`none`),window.location.assign(`${e}/protocol/openid-connect/auth?${a.toString()}`)},completar:async()=>{let r=new URLSearchParams(window.location.search),i=n(),a=i?.destino??`/`;if(!i||r.get(`state`)!==i.estado)return{tipo:`error`,destino:a};if(r.get(`error`)){let e=[`login_required`,`interaction_required`,`consent_required`].includes(r.get(`error`)??``);return{tipo:i.silencioso&&e?`requiere-ingreso`:`error`,destino:a}}let o=r.get(`code`);if(!o)return{tipo:`error`,destino:a};try{let n=await fetch(`${e}/protocol/openid-connect/token`,{method:`POST`,headers:{"Content-Type":`application/x-www-form-urlencoded`},body:new URLSearchParams({grant_type:`authorization_code`,code:o,redirect_uri:M(),client_id:t,code_verifier:i.verificador})});if(!n.ok)return{tipo:`error`,destino:a};let{id_token:r}=await n.json(),s=r?.split(`.`)[1];if(!s)return{tipo:`error`,destino:a};let c=JSON.parse(atob(s.replace(/-/g,`+`).replace(/_/g,`/`))),l=c.preferred_username??``,u=Te(l),d={nombre:c.name?.trim()||l};return{tipo:`ok`,identidad:u?{...d,ci:u}:d,destino:a,tokenId:r??``}}catch{return{tipo:`error`,destino:a}}},urlDeSalida:n=>{let r=new URLSearchParams({client_id:t,post_logout_redirect_uri:`${window.location.origin}/`});return n&&r.set(`id_token_hint`,n),`${e}/protocol/openid-connect/logout?${r.toString()}`}}},Oe={"sin-abrir":`Sin abrir`,abriendo:`Abriendo…`,abierto:`Abierto en segundo plano`,"sesion-cerrada":`Sesión cerrada: se vuelve a abrir al entrar`,"no-responde":`No responde`},N=(e,t=``)=>{let[,r,...i]=e.split(`/`);if(!n(r))return{sistema:null,interna:null};let a=i.length?`/${i.join(`/`)}${t}`:null;return{sistema:r,interna:a&&T(a)?a:null}},P=(e,t=null)=>e?`/${e}${t&&t!==`/`?t:``}`:`/`,F=e=>[...e.values()].flat().sort((e,t)=>Date.parse(t.fecha)-Date.parse(e.fecha)),ke=(e,t)=>{if(!e)return null;if(T(e))return e;try{let n=new URL(e);if(n.origin!==t)return null;let r=`${n.pathname}${n.search}${n.hash}`;return T(r)?r:null}catch{return null}},Ae=(e,t,n)=>{let r=e.filter(e=>e!==t),i=Math.max(0,n-+!!t);return r.slice(i)},je=2e4,Me=2,Ne=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),Pe=(e,t,n)=>{let i=new Map,a=[],o=typeof matchMedia==`function`?matchMedia(`(max-width: 759px)`):null,s=null,c=e=>i.get(e)?.estado??`sin-abrir`,l=(e,t)=>{let r=i.get(e);r&&r.estado!==t&&(r.estado=t,n())},u=e=>{let t=i.get(e);t&&(t.reloj&&clearTimeout(t.reloj),t.elemento.remove(),i.delete(e))},d=t=>{u(t);let a=document.createElement(`div`);a.className=`sin-respuesta`,a.hidden=t!==s,a.innerHTML=`<div><h2>No se pudo abrir ${Ne(r(t).nombre)}</h2><p class="suave">El sistema no responde. Los demás siguen funcionando.</p><button type="button" class="boton-principal" data-reintentar="${t}">Reintentar</button></div>`,e.append(a),i.set(t,{elemento:a,estado:`no-responde`,reloj:null}),n()},f=async(a,o)=>{u(a);let f=t[a],p=document.createElement(`iframe`);p.title=r(a).nombre,p.hidden=a!==s,i.set(a,{elemento:p,estado:`abriendo`,reloj:null}),n();try{await fetch(f.origen,{mode:`no-cors`,cache:`no-store`})}catch{d(a);return}if(i.get(a)?.elemento!==p)return;let m=i.get(a);m&&(m.reloj=setTimeout(()=>{c(a)===`abriendo`&&d(a)},je)),p.addEventListener(`load`,()=>{let e=i.get(a);e?.reloj&&clearTimeout(e.reloj),e?.elemento===p&&l(a,`abierto`)}),p.src=o&&f.entradaUnica?f.entradaUnica:f.url,e.append(p)},p=e=>{let t=a.indexOf(e);if(t>=0&&a.splice(t,1),a.unshift(e),o?.matches)for(let e of Ae(a,s,Me))u(e),a.splice(a.indexOf(e),1)};return{estado:c,mostrar:t=>{if(s=t,t){let e=c(t);(e===`sin-abrir`||e===`sesion-cerrada`)&&f(t,!0),p(t)}for(let[e,n]of i)n.elemento.hidden=e!==t;e.hidden=t===null,n()},precargar:e=>{c(e)===`sin-abrir`&&f(e,!0)},reintentar:e=>{f(e,!0)},marcarSesionCerrada:e=>{i.has(e)&&l(e,`sesion-cerrada`)},ventana:e=>{let t=i.get(e)?.elemento;return t instanceof HTMLIFrameElement?t.contentWindow:null},sistemaDeVentana:e=>{for(let[t,n]of i)if(n.elemento instanceof HTMLIFrameElement&&n.elemento.contentWindow===e)return t;return null},abiertos:()=>[...i.keys()].filter(e=>i.get(e)?.elemento instanceof HTMLIFrameElement),descargarTodos:()=>{for(let e of[...i.keys()])u(e);a.length=0,n()}}},I=Ce({BASE_URL:`/`,DEV:!1,MODE:`production`,PROD:!0,SSR:!1,VITE_CAPTACION_ENTRADA_UNICA:`https://captacion.ribersoft.com/api/cuenta-unica/iniciar`,VITE_CAPTACION_URL:`https://captacion.ribersoft.com/`,VITE_COBROS_ENTRADA_UNICA:`https://rb.ribersoft.com/api/v1/auth/sso/iniciar`,VITE_COBROS_URL:`https://rb.ribersoft.com/app/`,VITE_CUENTA_UNICA_CLIENTE:`portal`,VITE_CUENTA_UNICA_EMISOR:`https://cuenta.ribersoft.com/realms/riberbulma`,VITE_PANEL_WEB_ENTRADA_UNICA:`https://panel.ribersoft.com/api/sso/iniciar`,VITE_PANEL_WEB_URL:`https://panel.ribersoft.com/admin`,VITE_SEGUIMIENTO_ENTRADA_UNICA:`https://seguimiento.ribersoft.com/api/sso/iniciar`,VITE_SEGUIMIENTO_URL:`https://seguimiento.ribersoft.com/`}),L=De(I.emisor,I.cliente),R=`portal-ingreso-silencioso-intentado`,Fe=2e3,z=e=>{let t=document.querySelector(e);if(!t)throw Error(`Falta ${e} en index.html`);return t},B=z(`#barra`),V=z(`#ingreso`),H=z(`#ingresar`),U=z(`#mensaje-ingreso`),W=z(`#inicio`),G=z(`#marcos`),K=z(`#aviso-portal`),q={identidad:null,actual:`inicio`,tema:matchMedia(`(prefers-color-scheme: dark)`).matches?`oscuro`:`claro`,avisos:new Map,conPuente:new Set,pendientes:new Map,alCerrarSesion:new Map,rutas:new Map,tokenId:null},J=e=>e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]??e),Y=Pe(G,I.sistemas,()=>{q.actual===`inicio`&&Z()}),Ie=e=>{K.textContent=e,K.hidden=!1,window.setTimeout(()=>{K.hidden=!0},4e3)},X=(e,t)=>{Y.ventana(e)?.postMessage(t,I.sistemas[e].origen)},Le=(e,t)=>{q.conPuente.has(e)?X(e,{protocolo:w,tipo:`abrir`,ruta:t}):q.pendientes.set(e,t)},Re=e=>{let n=t.map(e=>({id:e.id,cargo:I.sistemas[e.id].entradaUnica?`Con cuenta única`:`Pide su propio ingreso`,url:`/${e.id}`}));return e.ci?{nombre:e.nombre,ci:e.ci,sistemas:n}:{nombre:e.nombre,sistemas:n}};function Z(){let e=q.identidad;if(!e)return;let n=t.map(e=>{let t=Y.estado(e.id),n=q.avisos.get(e.id)?.length??0;return`<button type="button" class="sistema" data-ir="${e.id}"><span class="icono" style="background:${e.color}">${e.abreviatura}</span><b>${J(e.nombre)}</b><span class="estado"><span class="punto ${t}"></span>${Oe[t]}</span>`+(n?`<span class="pendientes">${n} ${n===1?`aviso`:`avisos`}</span>`:``)+`</button>`}).join(``);W.innerHTML=`
    <div class="saludo"><h1>Hola, ${J(e.nombre.split(/\s+/)[0]??e.nombre)}</h1>
      <p class="suave">Entraste una sola vez. Tus sistemas se abren en segundo plano y te esperan donde los dejes.</p></div>
    <section><p class="rotulo">Tus sistemas</p><div class="tarjetas">${n}</div></section>
    <section class="caja"><p class="rotulo">Modo</p>
      <div class="modos">
        <button type="button" data-tema="claro" aria-pressed="${q.tema===`claro`}">Día</button>
        <button type="button" data-tema="oscuro" aria-pressed="${q.tema===`oscuro`}">Noche</button>
      </div>
      <p class="nota">El modo se aplica a la barra y a los sistemas conectados al portal.</p>
    </section>`}var Q=(e,{historial:t=!0,interna:n=null}={})=>{q.actual=e;let i=e===`inicio`?null:e;B.sistemaActual=i,Y.mostrar(i),W.hidden=i!==null,i||Z(),i&&n&&Le(i,n),document.title=`${i?r(i).nombre:`Inicio`} · Portal`;let a=P(i,n??(i?q.rutas.get(i)??null:null));t&&window.location.pathname+window.location.search!==a&&window.history.pushState({},``,a)},ze=e=>{q.tema=e,document.documentElement.dataset.tema=e,B.tema=e;for(let t of q.conPuente)X(t,{protocolo:w,tipo:`tema`,tema:e});q.actual===`inicio`&&Z()},Be=(e=``)=>{B.hidden=!0,W.hidden=!0,G.hidden=!0,V.hidden=!1,U.textContent=e,U.hidden=e===``,H.disabled=!1,document.title=`Portal`},Ve=(e,n)=>{sessionStorage.removeItem(R),q.identidad=e,B.persona=Re(e),B.avisos=[],B.hidden=!1,V.hidden=!0,ze(q.tema);let[r,i]=n.split(`?`),a=N(r??`/`,i?`?${i}`:``);if(window.history.replaceState({},``,P(a.sistema,a.interna)),Q(a.sistema??`inicio`,{historial:!1,interna:a.interna}),!matchMedia(`(max-width: 759px)`).matches)for(let e of t)Y.precargar(e.id)},He=async()=>{let e=[...q.conPuente];await Promise.race([Promise.all(e.map(async e=>await new Promise(t=>{q.alCerrarSesion.set(e,t),X(e,{protocolo:w,tipo:`salir`})}))),new Promise(e=>{window.setTimeout(e,Fe)})]),Y.descargarTodos(),q.identidad=null,B.persona=null,sessionStorage.setItem(R,`1`),window.location.assign(L.urlDeSalida(q.tokenId))};B.addEventListener(`barra-sistema`,e=>{e.preventDefault(),Q(e.detail.sistema)}),B.addEventListener(`barra-inicio`,e=>{e.preventDefault(),Q(`inicio`)}),B.addEventListener(`barra-aviso`,e=>{e.preventDefault();let{aviso:t}=e.detail,n=ke(t.url,I.sistemas[t.sistema].origen);Q(t.sistema,n?{interna:n}:{})}),B.addEventListener(`barra-salir`,()=>{He()}),B.addEventListener(`barra-cambiar-clave`,()=>{window.open(`${I.emisor}/account/#/security/signingin`,`_blank`,`noopener`),Ie(`La contraseña se cambia una sola vez, en la cuenta única, y vale para todos los sistemas.`)}),window.addEventListener(`message`,e=>{let t=Y.sistemaDeVentana(e.source);if(!t||e.origin!==I.sistemas[t].origen||!Se(e.data))return;let n=e.data;if(n.sistema===t)switch(n.tipo){case`listo`:{q.conPuente.add(t),X(t,{protocolo:w,tipo:`bienvenida`,tema:q.tema});let e=q.pendientes.get(t);e&&(q.pendientes.delete(t),X(t,{protocolo:w,tipo:`abrir`,ruta:e}));return}case`avisos`:q.avisos.set(t,n.avisos),B.avisos=F(q.avisos),q.actual===`inicio`&&Z();return;case`ruta`:q.rutas.set(t,n.ruta),q.actual===t&&window.history.replaceState({},``,P(t,n.ruta));return;case`sesion-cerrada`:q.conPuente.delete(t),q.avisos.delete(t),B.avisos=F(q.avisos),Y.marcarSesionCerrada(t),q.alCerrarSesion.get(t)?.(),q.alCerrarSesion.delete(t);return}});var $=e=>{let t=e.target instanceof Element?e.target.closest(`[data-ir],[data-tema],[data-reintentar]`):null;if(!t)return;let{ir:r,tema:i,reintentar:a}=t.dataset;n(r)&&Q(r),(i===`claro`||i===`oscuro`)&&ze(i),n(a)&&Y.reintentar(a)};W.addEventListener(`click`,$),G.addEventListener(`click`,$),H.addEventListener(`click`,()=>{H.disabled=!0,L.iniciar(window.location.pathname+window.location.search,!1)}),window.addEventListener(`popstate`,()=>{if(!q.identidad)return;let e=N(window.location.pathname,window.location.search);Q(e.sistema??`inicio`,{historial:!1,interna:e.interna})}),(async()=>{if(Ee()){let e=await L.completar();if(e.tipo===`ok`){q.tokenId=e.tokenId,Ve(e.identidad,e.destino);return}window.history.replaceState({},``,e.destino),Be(e.tipo===`error`?`No se pudo completar el ingreso con la cuenta única. Vuelve a intentarlo.`:``)}else sessionStorage.getItem(R)===`1`?Be():(sessionStorage.setItem(R,`1`),await L.iniciar(window.location.pathname+window.location.search,!0))})();