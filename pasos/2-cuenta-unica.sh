#!/bin/bash
# Paso 2 · Cuenta única en cuenta.rb.ribersoft.com (Setup Node.js App, Node 24) con su base MariaDB.
# Primera vez: crea base + usuario (clave al azar que NO se muestra), configuración con claves y secretos nuevos.
# Siguientes veces: solo actualiza el código y reinicia (la configuración y las personas se conservan).
source "$(dirname "$0")/comun.sh"

BASE="${CUENTA}_cuentaunica"
ORIGEN="$PAQUETE/cuenta-unica-app"
[ -f "$ORIGEN/app.cjs" ] || falla "No encuentro $ORIGEN (¿descomprimió el paquete completo?)"
existe_subdominio cuenta || falla "Primero corra el paso 1 (no existe cuenta.$SUF)"
PRIMERA=1; [ -f "$DATOS_CU/config.json" ] && PRIMERA=0

titulo "Paso 2 · Cuenta única"
if [ "$PRIMERA" = 1 ]; then
  echo "  Primera instalación:"
  echo "   - base de datos $BASE y usuario $BASE (clave al azar, guardada solo en $DATOS_CU/config.json, permisos 600)"
  echo "   - claves de firma y secretos NUEVOS para los 5 clientes"
else
  echo "  Actualización: se conserva $DATOS_CU/config.json y las personas."
fi
echo "   - código en $CASA/$APP_CU (respaldo del anterior en $DATOS_CU/respaldos/)"
echo "   - app de Node 24 en https://cuenta.$SUF (arranque: app.cjs)"
confirmar

mkdir -p "$DATOS_CU/respaldos" && chmod 700 "$DATOS_CU"

if [ "$PRIMERA" = 1 ]; then
  titulo "Base de datos"
  if uapi --output=json Mysql list_databases | json "d.result.data.some(x=>x.database==='$BASE')" | grep -q true; then
    falla "La base $BASE ya existe pero no hay configuración. Revise a mano (no se borra nada)."
  fi
  CLAVE_BD="$(openssl rand -hex 24)"
  uapi_ok Mysql create_database name="$BASE" >/dev/null && ok "base $BASE"
  uapi_ok Mysql create_user name="$BASE" password="$CLAVE_BD" >/dev/null && ok "usuario $BASE"
  uapi_ok Mysql set_privileges_on_database user="$BASE" database="$BASE" privileges=ALL%20PRIVILEGES >/dev/null && ok "permisos"
fi

titulo "Código"
if [ -d "$CASA/$APP_CU/src" ]; then
  tar czf "$DATOS_CU/respaldos/app-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$CASA/$APP_CU" src app.cjs package.json package-lock.json 2>/dev/null || true
  rm -rf "$CASA/$APP_CU/src"
fi
mkdir -p "$CASA/$APP_CU"
cp -R "$ORIGEN/src" "$ORIGEN/app.cjs" "$ORIGEN/package.json" "$ORIGEN/package-lock.json" "$CASA/$APP_CU/"
ok "copiado a $CASA/$APP_CU"

titulo "App de Node"
if cloudlinux-selector get --json --interpreter nodejs 2>/dev/null | grep -q "\"$APP_CU\""; then
  ok "la app ya existía"
else
  cloudlinux-selector create --json --interpreter nodejs --version 24 --app-root "$APP_CU" \
    --domain "cuenta.$SUF" --app-uri / --app-mode production --startup-file app.cjs >/dev/null
  ok "app creada (Node 24, cuenta.$SUF)"
fi
cloudlinux-selector install-modules --json --interpreter nodejs --app-root "$APP_CU" >/dev/null && ok "dependencias instaladas (npm)"
NODE_APP="$(ls -d "$CASA"/nodevenv/"$APP_CU"/*/bin/node 2>/dev/null | head -1)"
[ -x "$NODE_APP" ] || falla "No encuentro el node de la app en $CASA/nodevenv/$APP_CU"
admin() { (cd "$CASA/$APP_CU" && "$NODE_APP" src/admin.ts "$@"); }

if [ "$PRIMERA" = 1 ]; then
  CU_BASE="mysql://$BASE:$CLAVE_BD@localhost/$BASE" admin configurar --dominio "$SUF" >/dev/null && ok "configuración creada (600)"
  unset CLAVE_BD
fi
admin migrar >/dev/null && ok "tablas listas"

# HTTPS obligatorio (cPanel escribe sus líneas de Passenger en este mismo .htaccess; las nuestras van marcadas).
HT="$DOCROOT_CU/.htaccess"
if ! grep -q "# rb-cuenta-unica: https" "$HT" 2>/dev/null; then
  { printf '# rb-cuenta-unica: https\nRewriteEngine On\nRewriteCond %%{HTTPS} off\nRewriteRule ^ https://%%{HTTP_HOST}%%{REQUEST_URI} [L,R=301]\n# rb-cuenta-unica: fin\n\n'; cat "$HT" 2>/dev/null || true; } > "$HT.nuevo" && mv "$HT.nuevo" "$HT"
  ok "redirección a HTTPS en $HT"
fi
cloudlinux-selector restart --json --interpreter nodejs --app-root "$APP_CU" >/dev/null && ok "app reiniciada"

titulo "Prueba"
sleep 3
URL="https://cuenta.$SUF/realms/riberbulma/.well-known/openid-configuration"
CODIGO="$(curl -sk -o /tmp/cu-descubrimiento.$$ -w '%{http_code}' --max-time 30 "$URL" || true)"
if [ "$CODIGO" = "200" ] && grep -q '"issuer":"https://cuenta' /tmp/cu-descubrimiento.$$; then
  ok "responde: $URL"
else
  aviso "aún no responde bien (HTTP $CODIGO). Si el certificado está pendiente, espere y corra: bash $(dirname "$0")/0-revisar.sh"
fi
rm -f /tmp/cu-descubrimiento.$$

echo
echo "Comandos de administración (crear persona, nueva clave, listar...):"
echo "  cd ~/$APP_CU && $NODE_APP src/admin.ts"
[ "$PRIMERA" = 1 ] && echo "Siguiente: bash $(dirname "$0")/3-portal.sh   y luego   bash $(dirname "$0")/5-secretos.sh"
exit 0
