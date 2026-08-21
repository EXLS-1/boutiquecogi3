import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = '__Host-2fa-verified';

// ─── Décode la base64 en Uint8Array pour jose ───
function getSecret(): Uint8Array {
  const raw = process.env.TWOFA_COOKIE_SECRET;
  if (!raw) throw new Error('[2FA] TWOFA_COOKIE_SECRET manquant dans .env.local');

  // Si c'est du base64 (recommandé), on décode. Sinon fallback TextEncoder.
  const isBase64 = /^[A-Za-z0-9+/]{43}={0,2}$/.test(raw) && raw.length === 44;
  
  if (isBase64) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) throw new Error('[2FA] TWOFA_COOKIE_SECRET doit décoder en exactement 32 octets');
    return new Uint8Array(buf);
  }

  // Fallback : chaîne brute (min 32 caractères)
  if (raw.length < 32) throw new Error('[2FA] TWOFA_COOKIE_SECRET trop court (min 32 chars)');
  return new TextEncoder().encode(raw);
}

const SECRET = getSecret();

export async function sign2FAVerified(userId: string, sessionToken: string) {
  const token = await new SignJWT({
    sub: userId,
    sid: sessionToken,
    type: '2fa-verified',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function verify2FAVerified(sessionToken: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  try {
    const { payload } = await jwtVerify(raw, SECRET, { clockTolerance: 60 });
    return payload.sid === sessionToken;
  } catch {
    return false;
  }
}

export async function clear2FAVerified() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
