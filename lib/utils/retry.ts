// lib/utils/retry.ts

interface RetryOptions {
  retries?: number;
  minTimeoutMs?: number;
  maxTimeoutMs?: number;
  factor?: number;
}

/**
 * Exécute une opération asynchrone avec réessais exponentiels et gigue aléatoire.
 * Empêche le phénomène de "thundering herd" sur les API externes.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minTimeoutMs = 500,
    maxTimeoutMs = 5000,
    factor = 2,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }

      // Calcul du délai exponentiel
      const exponentialDelay = minTimeoutMs * Math.pow(factor, attempt - 1);
      // Ajout de gigue (jitter) pour étaler les requêtes concurrentes (±20%)
      const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.min(maxTimeoutMs, exponentialDelay + jitter);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
