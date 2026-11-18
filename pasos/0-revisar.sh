#!/bin/bash
# Paso 0 · SOLO LECTURA: muestra el estado actual. No cambia nada.
source "$(dirname "$0")/comun.sh"

titulo "Subdominios"
for s in portal cuenta captacion seguimiento panel; do
  if existe_subdominio "$s"; then echo "  $s.$SUF: subdominio del cPanel"; else echo "  $s.$SUF: no existe en cPanel"; fi
done

titulo "DNS (registros de los subdominios nuevos)"
uapi --output=json DNS parse_zone zone="$DOMINIO" | json "d.result.data.filter(r=>r.type==='record').map(r=>({n:Buffer.from(r.dname_b64,'base64').toString(),t:r.record_type,v:(r.data_b64||[]).map(x=>Buffer.from(x,'base64').toString()).join(' ')})).filter(r=>/^(portal|cuenta|captacion|seguimiento|panel)\\.rb(\\.|$)/.test(r.n)).map(r=>'  '+r.n+' '+r.t+' '+r.v).join('\\n')||'  (ninguno)'"
echo

titulo "Cuenta única"
[ -f "$DATOS_CU/config.json" ] && ok "configuración: $DATOS_CU/config.json" || aviso "sin configuración todavía"
if cloudlinux-selector get --json --interpreter nodejs 2>/dev/null | grep -q "\"$APP_CU\""; then ok "app de Node $APP_CU creada"; else aviso "sin app de Node todavía"; fi
curl -s -o /dev/null -w "  https://cuenta.$SUF/realms/riberbulma/.well-known/openid-configuration → HTTP %{http_code}\n" --max-time 10 "https://cuenta.$SUF/realms/riberbulma/.well-known/openid-configuration" || aviso "cuenta.$SUF aún no responde"

titulo "Portal"
[ -f "$DOCROOT_PORTAL/index.html" ] && ok "publicado en $DOCROOT_PORTAL" || aviso "sin publicar"
