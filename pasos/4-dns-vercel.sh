#!/bin/bash
# Paso 4 · Registros DNS para los sistemas que siguen en Vercel (proyectos de Fer).
# Hacerlo DESPUÉS de que Fer agregue cada dominio en Vercel: Vercel muestra el valor exacto del CNAME.
# Uso: bash 4-dns-vercel.sh [captacion=VALOR] [seguimiento=VALOR] [panel=VALOR]   (por defecto cname.vercel-dns.com)
# Solo AGREGA registros que no existen. Nunca crea esos subdominios en el cPanel (pisarían a Vercel).
source "$(dirname "$0")/comun.sh"

declare -a NOMBRES=(captacion seguimiento panel)
valor() { local v="cname.vercel-dns.com"; for a in "${ARGS[@]}"; do [ "${a%%=*}" = "$1" ] && v="${a#*=}"; done; echo "${v%.}."; }
ARGS=("$@")

titulo "Paso 4 · DNS hacia Vercel"
ZONA="$(uapi --output=json DNS parse_zone zone="$DOMINIO")"
PLAN=()
for n in "${NOMBRES[@]}"; do
  if existe_subdominio "$n"; then falla "$n.$DOMINIO existe como subdominio del cPanel: quítelo antes (si no, no llega a Vercel)."; fi
  hay="$(printf '%s' "$ZONA" | json "d.result.data.filter(r=>r.type==='record'&&Buffer.from(r.dname_b64,'base64').toString().replace(/\\.$/,'')==='$n' || r.type==='record'&&Buffer.from(r.dname_b64,'base64').toString()==='$n.$DOMINIO.').map(r=>r.record_type+' '+(r.data_b64||[]).map(x=>Buffer.from(x,'base64').toString()).join(' ')).join('; ')")"
  if [ -n "$hay" ]; then ok "$n.$DOMINIO ya tiene: $hay (no se toca)"; else PLAN+=("$n"); echo "  + $n.$DOMINIO CNAME $(valor "$n")"; fi
done
[ ${#PLAN[@]} -eq 0 ] && { echo "Nada que agregar."; exit 0; }
confirmar

SERIAL="$(printf '%s' "$ZONA" | json "Buffer.from(d.result.data.find(r=>r.record_type==='SOA').data_b64[2],'base64').toString()")"
AGREGAR=()
for n in "${PLAN[@]}"; do AGREGAR+=("add={\"dname\":\"$n\",\"ttl\":3600,\"record_type\":\"CNAME\",\"data\":[\"$(valor "$n")\"]}"); done
uapi_ok DNS mass_edit_zone zone="$DOMINIO" serial="$SERIAL" "${AGREGAR[@]}" >/dev/null
ok "registros agregados. Vercel los verifica solo (puede tardar unos minutos)."
