// prisma/seed/utils/random.ts
// ============================================
// PRNG DÉTERMINISTE (mulberry32) & HELPEURS
// ============================================
// Aucun Faker aléatoire : on utilise un générateur pseudo-aléatoire à
// graine fixe pour que le seed soit reproductible. Le seedNumber du
// contexte est combiné à un index pour dériver la graine.

/** PRNG mulberry32 — déterministe, rapide, seedable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Crée un PRNG déterministe à partir du seedNumber global + namespace. */
export function createSeededRandom(seedNumber: number, namespace: string, index = 0): () => number {
  let hash = 2166136261;
  const str = `${seedNumber}:${namespace}:${index}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return mulberry32(hash >>> 0);
}

/** Entier aléatoire dans [min, max] inclus. */
export function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Élément aléatoire d'un tableau. */
export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Choisit un élément pondéré. */
export function weightedPick<T>(rand: () => number, items: ReadonlyArray<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Mélange déterministe d'un tableau (Fisher-Yates avec PRNG). */
export function shuffle<T>(rand: () => number, arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
