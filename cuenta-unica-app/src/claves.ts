import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Claves con scrypt de node:crypto (sin módulos nativos: se instala igual en el cPanel).
// Formato guardado: scrypt$N$r$p$sal$hash (base64url), así se puede subir N en el futuro.
const N = 16384;
const R = 8;
const P = 1;
const LARGO = 32;

const derivar = (clave: string, sal: Buffer, n: number, r: number, p: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(clave.normalize('NFC'), sal, LARGO, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, hash) => {
      if (error) reject(error);
      else resolve(hash);
    });
  });

export const cifrarClave = async (clave: string): Promise<string> => {
  const sal = randomBytes(16);
  const hash = await derivar(clave, sal, N, R, P);
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64url')}$${hash.toString('base64url')}`;
};

/** Hash de relleno: se usa cuando la persona no existe, para tardar lo mismo (no revela qué carnets existen). */
const RELLENO = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const verificarClave = async (clave: string, guardada: string | null): Promise<boolean> => {
  const partes = (guardada ?? RELLENO).split('$');
  const [tipo, n, r, p, sal, hash] = partes;
  if (partes.length !== 6 || tipo !== 'scrypt' || !n || !r || !p || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64url');
  const obtenido = await derivar(clave, Buffer.from(sal, 'base64url'), Number(n), Number(r), Number(p));
  return guardada !== null && esperado.length === obtenido.length && timingSafeEqual(esperado, obtenido);
};
