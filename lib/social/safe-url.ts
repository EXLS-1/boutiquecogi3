// /lib/safe-url.ts

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);

    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  return isSafeUrl(url) ? url : "#";
}
