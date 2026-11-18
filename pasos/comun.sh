#!/bin/bash
# Funciones comunes de los pasos de despliegue (Terminal del cPanel). No se ejecuta solo.
set -euo pipefail

DOMINIO="ribersoft.com"
CUENTA="$(whoami)"
CASA="$HOME"
PAQUETE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_SISTEMA="${NODE_SISTEMA:-/opt/alt/alt-nodejs24/root/usr/bin/node}"
APP_CU="cuenta-unica-app"                       # carpeta de la app de Node (fuera de public_html)
DATOS_CU="$CASA/cuenta-unica-datos"             # config.json (600) y respaldos
DOCROOT_CU="$CASA/cuenta.$DOMINIO"
DOCROOT_PORTAL="$CASA/portal.$DOMINIO"

titulo() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
ok()     { printf '  \033[32m✓\033[0m %s\n' "$1"; }
aviso()  { printf '  \033[33m!\033[0m %s\n' "$1"; }
falla()  { printf '  \033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

confirmar() {
  printf '\n¿Continuar? Escriba SI (en mayúsculas): '
  read -r r
  [ "$r" = "SI" ] || { echo "Cancelado: no se cambió nada."; exit 0; }
}

# Lee JSON de stdin y evalúa una expresión JS sobre `d` (no hace falta jq).
# Si la respuesta no es JSON (p. ej. un error de cPanel en texto), escribe NO-JSON y lo que llegó, sin pila de Node.
json() { "$NODE_SISTEMA" -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{let d;try{d=JSON.parse(s)}catch{process.stdout.write('NO-JSON: '+s.slice(0,300));return}const v=($1);process.stdout.write(v===undefined||v===null?'':String(v))})"; }

# uapi con salida JSON; falla con el mensaje de cPanel si status != 1.
uapi_ok() {
  local salida
  salida="$(uapi --output=json "$@")"
  if [ "$(printf '%s' "$salida" | json 'd.result.status')" != "1" ]; then
    falla "uapi $1 $2: $(printf '%s' "$salida" | json '(d.result.errors||[]).join(" ")')"
  fi
  printf '%s' "$salida"
}

existe_subdominio() {
  uapi --output=json DomainInfo list_domains | json "d.result.data.sub_domains.includes('$1.$DOMINIO')" | grep -q true
}

[ -x "$NODE_SISTEMA" ] || falla "No encuentro Node 24 en $NODE_SISTEMA"
command -v uapi >/dev/null || falla "Falta uapi (¿está en la Terminal del cPanel?)"
