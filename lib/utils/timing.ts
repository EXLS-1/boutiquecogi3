// lib/utils/timing.ts
/**
 * Crée une version "debounced" d'une fonction qui retarde son exécution
 * jusqu'à ce qu'un délai de 'wait' millisecondes s'écoule depuis le dernier appel.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}
