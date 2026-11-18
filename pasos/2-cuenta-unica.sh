#!/bin/bash
# Paso 2 · Cuenta única en cuenta.rb.ribersoft.com (Setup Node.js App, Node 24) con su base MariaDB.
# Primera vez: la BASE y su USUARIO los crea usted en cPanel (MySQL Database Wizard); el script los pide, prueba la
# conexión y crea la configuración con claves y secretos nuevos. La clave se escribe oculta y no queda en el historial.
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
  echo "   - usa la base y el usuario que USTED creó en cPanel (se los pedirá; la clave queda solo en $DATOS_CU/config.json, 600)"
  echo "   - claves de firma y secretos NUEVOS para los 5 clientes"
else
  echo "  Actualización: se conserva $DATOS_CU/config.json y las personas."
fi
echo "   - código en $CASA/$APP_CU (respaldo del anterior en $DATOS_CU/respaldos/)"
echo "   - app de Node 24 en https://cuenta.$SUF (arranque: app.cjs)"
confirmar

mkdir -p "$DATOS_CU/respaldos" && chmod 700 "$DATOS_CU"

if [ "$PRIMERA" = 1 ]; then
  titulo "Base de datos (la creó usted en cPanel)"
  read -r -p "  Nombre de la base [$BASE]: " NOMBRE_BD; NOMBRE_BD="${NOMBRE_BD:-$BASE}"
  read -r -p "  Usuario de la base [$NOMBRE_BD]: " USUARIO_BD; USUARIO_BD="${USUARIO_BD:-$NOMBRE_BD}"
  read -r -s -p "  Clave de ese usuario (no se ve al escribir): " CLAVE_BD; echo
  [ -n "$CLAVE_BD" ] || falla "La clave está vacía."
  # MYSQL_PWD: la clave no aparece en la lista de procesos ni en el historial.
  if ! MYSQL_PWD="$CLAVE_BD" mariadb -u "$USUARIO_BD" -h localhost "$NOMBRE_BD" -e "CREATE TABLE IF NOT EXISTS cu_prueba_permiso (x INT); DROP TABLE cu_prueba_permiso;" 2>/dev/null; then
    falla "No conecta o el usuario no tiene TODOS los privilegios sobre $NOMBRE_BD. Revise en cPanel → Bases de datos MySQL."
  fi
  ok "conexión y permisos correctos ($USUARIO_BD → $NOMBRE_BD)"
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
  # La URL se arma en Node (codifica caracteres especiales de la clave); todo viaja por variables de entorno.
  CU_BASE="$(U="$USUARIO_BD" C="$CLAVE_BD" B="$NOMBRE_BD" "$NODE_SISTEMA" -e 'const e=encodeURIComponent;process.stdout.write(`mysql://${e(process.env.U)}:${e(process.env.C)}@localhost/${e(process.env.B)}`)')"
  CU_BASE="$CU_BASE" admin configurar --dominio "$SUF" >/dev/null && ok "configuración creada (600)"
  unset CLAVE_BD CU_BASE
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
