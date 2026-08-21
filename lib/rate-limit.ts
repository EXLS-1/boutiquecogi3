interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now > e.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, resetAt: now + windowMs };
  }
  if (e.count >= max) return { success: false, remaining: 0, resetAt: e.resetAt };
  e.count++;
  return { success: true, remaining: max - e.count, resetAt: e.resetAt };
}

// Nettoyage mémoire toutes les 60s
setInterval(() => {
  const n = Date.now();
  for (const [k, v] of store.entries()) if (n > v.resetAt) store.delete(k);
}, 60000);
