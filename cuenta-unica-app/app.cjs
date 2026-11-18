// Arranque para Passenger (cPanel → Setup Node.js App → "Application startup file": app.cjs).
// Passenger carga este archivo con require(); el servidor es un módulo ES en TypeScript (Node 24 lo ejecuta directo).
import('./src/servidor.ts').catch((e) => {
  console.error('[cuenta-unica] no arrancó:', e && e.message);
  process.exit(1);
});
