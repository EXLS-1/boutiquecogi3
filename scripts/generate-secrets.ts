import { randomBytes, scryptSync } from 'crypto';

console.log('=== Génération des secrets 2FA ===\n');

// ─── 1. TWOFA_COOKIE_SECRET (aléatoire pure, base64) ───
const cookieSecretBytes = randomBytes(32);
const cookieSecretBase64 = cookieSecretBytes.toString('base64');
console.log('# TWOFA_COOKIE_SECRET (base64, 256 bits entropie)');
console.log(cookieSecretBase64);
console.log('\n# Pour jose : décodez cette base64 en Uint8Array\n');

// ─── 2. TWOFA_ENCRYPTION_KEY (phrase dérivée ou aléatoire) ───
// Option A : Clé aléatoire (recommandé si vous utilisez un vault)
const encKeyRandom = randomBytes(32).toString('base64');
console.log('# TWOFA_ENCRYPTION_KEY (aléatoire base64) — Option A');
console.log(encKeyRandom);

// Option B : Phrase de passe dérivée (si vous préférez la mémoriser)
const passphrase = `boutiquecogi3-${randomBytes(8).toString('hex')}-master-key-2026`;
const encKeyDerived = scryptSync(passphrase, 'unique-salt-16b', 32).toString('base64');
console.log('\n# TWOFA_ENCRYPTION_KEY (dérivée scrypt) — Option B');
console.log(`Passphrase: ${passphrase}`);
console.log(`Clé dérivée: ${encKeyDerived}`);

console.log('\n=== Copiez les valeurs dans .env.local ===');
