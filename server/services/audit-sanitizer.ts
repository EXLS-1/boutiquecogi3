const SENSITIVE_KEY =
  /(password|passphrase|secret|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|cookie|credit[_-]?card|card[_-]?number|cvv|cvc|ssn|email|phone|address|birth|medical|health|iban|bank)/i;

const REDACTED = "[REDACTED]";

function sanitizeValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (ancestors.has(value)) return "[Circular]";

  ancestors.add(value);
  if (Array.isArray(value)) {
    const sanitized = value.map((item) => sanitizeValue(item, ancestors));
    ancestors.delete(value);
    return sanitized;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_KEY.test(key)
      ? REDACTED
      : sanitizeValue(item, ancestors);
  }
  ancestors.delete(value);
  return sanitized;
}

export function sanitizeAuditValue(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet<object>());
}

export function sanitizeAuditText(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(sanitizeAuditValue(parsed));
  } catch {
    return value.replace(
      /((?:password|passphrase|secret|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|cookie|credit[_-]?card|card[_-]?number|cvv|cvc|ssn|email|phone|address|birth|medical|health|iban|bank)\s*["']?\s*[:=]\s*["']?)[^,\s"'&}]+/gi,
      `$1${REDACTED}`,
    );
  }
}
