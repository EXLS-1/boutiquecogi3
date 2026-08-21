import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from './crypto';

const ISSUER = process.env.APP_NAME || 'Boutiquecogi3';

export function generateTOTPSecret(userId: string) {
  const secret = new OTPAuth.Secret({ size: 32 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userId,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return {
    base32: secret.base32,
    uri: totp.toString(),
    qrUri: `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(userId)}?secret=${secret.base32}&issuer=${encodeURIComponent(ISSUER)}`,
  };
}

export function verifyTOTP(encryptedSecret: string, code: string): boolean {
  try {
    const secret = OTPAuth.Secret.fromBase32(decrypt(encryptedSecret));
    const totp = new OTPAuth.TOTP({ secret, digits: 6, period: 30 });
    return totp.validate({ token: code, window: 1 }) !== null;
  } catch {
    return false;
  }
}

export function generateBackupCodes() {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    const code = `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`;
    plain.push(code);
    hashed.push(bcrypt.hashSync(code, 12));
  }
  return { plain, hashed };
}

export function verifyBackupCode(code: string, hashes: string[]) {
  for (let i = 0; i < hashes.length; i++) {
    if (bcrypt.compareSync(code, hashes[i])) return { valid: true, index: i };
  }
  return { valid: false, index: -1 };
}
