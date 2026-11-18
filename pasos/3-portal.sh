#!/bin/bash
# Paso 3 · Publica el portal (archivos estáticos) en portal.ribersoft.com. Repetible; guarda respaldo.
source "$(dirname "$0")/comun.sh"

ORIGEN="$PAQUETE/portal"
[ -f "$ORIGEN/index.html" ] || falla "No encuentro $ORIGEN/index.html"
existe_subdominio portal || falla "Primero corra el paso 1 (no existe portal.$DOMINIO)"

titulo "Paso 3 · Portal"
echo "  Se reemplaza el contenido de $DOCROOT_PORTAL por el portal del paquete (respaldo en ~/portal-respaldos/)."
confirmar

mkdir -p "$CASA/portal-respaldos" "$DOCROOT_PORTAL"
if [ -f "$DOCROOT_PORTAL/index.html" ]; then
  tar czf "$CASA/portal-respaldos/portal-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$DOCROOT_PORTAL" . && ok "respaldo guardado"
fi
find "$DOCROOT_PORTAL" -mindepth 1 -maxdepth 1 ! -name '.well-known' ! -name 'cgi-bin' -exec rm -rf {} +
cp -R "$ORIGEN/." "$DOCROOT_PORTAL/"
ok "portal publicado"
CODIGO="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 20 "https://portal.$DOMINIO/callback" || true)"
[ "$CODIGO" = "200" ] && ok "https://portal.$DOMINIO responde (también /callback)" || aviso "portal.$DOMINIO devolvió HTTP $CODIGO (¿certificado pendiente?)"
