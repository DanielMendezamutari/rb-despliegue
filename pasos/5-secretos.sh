#!/bin/bash
# Paso 5 · Muestra las variables de cuenta única para cada sistema. MUESTRA SECRETOS: no comparta la pantalla.
source "$(dirname "$0")/comun.sh"
NODE_APP="$(ls -d "$CASA"/nodevenv/"$APP_CU"/*/bin/node 2>/dev/null | head -1)"
[ -x "$NODE_APP" ] || falla "Primero corra el paso 2."
titulo "Variables por sistema (cópielas al lugar indicado en la guía; no las pegue en chats)"
(cd "$CASA/$APP_CU" && "$NODE_APP" src/admin.ts secretos)
