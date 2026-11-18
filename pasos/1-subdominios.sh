#!/bin/bash
# Paso 1 · Crea portal.rb.ribersoft.com y cuenta.rb.ribersoft.com en ESTE cPanel y pide su certificado (AutoSSL).
# Repetible: lo que ya existe se omite. NO toca rb.ribersoft.com ni ningún otro subdominio.
source "$(dirname "$0")/comun.sh"

titulo "Paso 1 · Subdominios en el cPanel"
echo "  Se crearán (si no existen):"
echo "   - portal.$SUF  → carpeta $DOCROOT_PORTAL   (el portal)"
echo "   - cuenta.$SUF  → carpeta $DOCROOT_CU   (la cuenta única; la atiende la app de Node)"
echo "  Luego se pide el certificado HTTPS (AutoSSL)."
confirmar

for s in portal cuenta; do
  if existe_subdominio "$s"; then ok "$s.$SUF ya existía"; continue; fi
  uapi_ok SubDomain addsubdomain domain="$s.$GRUPO" rootdomain="$DOMINIO" dir="$s.$SUF" disallowdot=0 >/dev/null
  ok "$s.$SUF creado"
done

if uapi --output=json SSL start_autossl_check | json 'd.result.status' | grep -q 1; then
  ok "AutoSSL pedido: el certificado tarda de 5 a 30 minutos (cPanel → SSL/TLS Status)."
else
  aviso "No se pudo pedir AutoSSL por comando: hágalo en cPanel → SSL/TLS Status → Run AutoSSL."
fi
echo
echo "Siguiente: bash $(dirname "$0")/2-cuenta-unica.sh"
