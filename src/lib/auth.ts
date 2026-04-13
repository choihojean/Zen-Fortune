/**
 * Single-password admin auth.
 * - POST /api/admin/login verifies password, sets HMAC-signed session cookie.
 * - Middleware verifies cookie on every /admin/** and /api/admin/** request.
 *
 * Cookie format: `${expISO}.${base64urlSig}`
 *   sig = HMAC-SHA256(SESSION_SECRET, expISO)
 */

const COOKIE_NAME = 'zf_admin';
const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return b64url(sig);
}

export async function createSessionCookie(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const expStr = String(exp);
  const sig = await sign(secret, expStr);
  const value = `${expStr}.${sig}`;
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function clearSessionCookie(): string {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export async function verifyRequest(request: Request, secret: string): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;

  const value = match.slice(COOKIE_NAME.length + 1);
  const dot = value.indexOf('.');
  if (dot < 0) return false;

  const expStr = value.slice(0, dot);
  const sigStr = value.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const expected = await sign(secret, expStr);
  // constant-time compare
  if (expected.length !== sigStr.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sigStr.charCodeAt(i);
  }
  return diff === 0;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
