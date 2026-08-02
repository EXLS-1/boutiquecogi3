// lib/utils/sku.ts

export function generateSKU(name: string): string {
  const prefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}
