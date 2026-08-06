// prisma/seed/utils/hash.ts
// ============================================
// HACHAGE STATIQUE EN CACHE (BetterAuth / bcrypt)
// ============================================
// Le hachage sécurisé d'un mot de passe coûte ~50-100 ms par utilisateur.
// Pour 500 utilisateurs de test, cela représente des dizaines de secondes
// de CPU inutile. On met en cache un hash unique partagé pour toutes les
// entités fictives de dev/test. Seul le seed prod/super-admin utilise un
// vrai hachage unique.

import { hash } from "bcryptjs";

const DEFAULT_PASSWORD = "Password123!";
const DEV_BCRYPT_ROUNDS = 4; // léger pour le dev/test (4 rounds)
const PROD_BCRYPT_ROUNDS = 12; // coût de production

let cachedDevHash: string | null = null;

/**
 * Renvoie un mot de passe haché mis en cache pour le seed de dev/test.
 * N'exécute l'algorithme coûteux qu'une seule fois par lancement.
 */
export async function getStaticPasswordHash(
  plainTextPassword = DEFAULT_PASSWORD,
): Promise<string> {
  if (!cachedDevHash) {
    cachedDevHash = await hash(plainTextPassword, DEV_BCRYPT_ROUNDS);
  }
  return cachedDevHash;
}

/**
 * Hachage unique (non mis en cache) — réservé au Super Admin de prod.
 * Chaque appel produit un hash distinct mais vérifiable.
 */
export async function hashPasswordUnique(
  plainTextPassword: string,
  rounds = PROD_BCRYPT_ROUNDS,
): Promise<string> {
  return hash(plainTextPassword, rounds);
}
