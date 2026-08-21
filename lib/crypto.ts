import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = (() => {
  const secret = process.env.TWOFA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('[2FA] TWOFA_ENCRYPTION_KEY must be ≥ 32 chars');
  }
  return scryptSync(secret, 'boutiquecogi3-salt', 32);
})();

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decrypt(data: string): string {
  const [iv, tag, enc] = data.split(':').map((h) => Buffer.from(h, 'hex'));
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}