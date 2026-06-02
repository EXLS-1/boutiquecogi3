// lib/orders/format-order-id.ts

export function formatOrderShortId(orderId: string): string {
  if (!orderId || typeof orderId !== "string") {
    return "UNKNOWN";
  }

  const sanitized = orderId.trim();

  if (sanitized.length < 8) {
    return sanitized.toUpperCase();
  }

  return sanitized.slice(-8).toUpperCase();
}
