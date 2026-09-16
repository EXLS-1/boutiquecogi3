// lib/admin/shared/safe-query.ts
// =============================================================================
// LECTURE DÉFENSIVE — Dégradation contrôlée des lectures non critiques
// =============================================================================
// Les pages d'observation admin (santé, analytique, marketing…) doivent rester
// consultables même si une requête secondaire échoue (table absente, migration
// partielle, timeout réseau, colonne renommée…).
//
// RÈGLE : une lecture d'OBSERVATION ne doit jamais transformer la page en 500.
// En revanche on ne masque pas l'erreur : elle est journalisée côté serveur avec
// un préfixe stable, et chaque page expose explicitement les sections en
// « donnée indisponible » via le flag renvoyé par les services.

export interface SafeReadResult<T> {
  data: T;
  /** true si la lecture a échoué et que la valeur de repli a été utilisée. */
  degraded: boolean;
}

/**
 * Exécute une lecture Prisma non critique.
 *
 * @param label    — Étiquette de journalisation (ex. "health:auditLog").
 * @param run      — La lecture à exécuter.
 * @param fallback — Valeur retournée en cas d'échec.
 */
export async function safeQuery<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(
      `[admin:read] ${label} a échoué :`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

/** Variante exposant l'état de dégradation (pour affichage explicite côté UI). */
export async function safeQueryWithFlag<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<SafeReadResult<T>> {
  try {
    return { data: await run(), degraded: false };
  } catch (error) {
    console.error(
      `[admin:read] ${label} a échoué :`,
      error instanceof Error ? error.message : error,
    );
    return { data: fallback, degraded: true };
  }
}

/**
 * Exécute plusieurs lectures en parallèle en isolant CHAQUE échec.
 * Contrairement à `Promise.all`, une requête en erreur n'annule pas les autres.
 */
export async function safeQueryAll<T extends Record<string, () => Promise<unknown>>>(
  entries: T,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }> {
  const keys = Object.keys(entries) as Array<keyof T>;

  const settled = await Promise.all(
    keys.map(async (key) => {
      try {
        return await entries[key]();
      } catch (error) {
        console.error(
          `[admin:read] ${String(key)} a échoué :`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    }),
  );

  return Object.fromEntries(
    keys.map((key, index) => [key, settled[index]]),
  ) as { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };
}