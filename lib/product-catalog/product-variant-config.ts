
import type { ProductVariantConfig } from "@/components/product-variant/product-variant";

type PrismaVariantLike = {
  readonly id: string;
  readonly sku: string;
  readonly attributes: unknown;
  readonly priceOffset: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly variantStocks: readonly {
    readonly quantity: number;
    readonly reserved: number;
  }[];
};

export type PrismaProductVariantInput = {
  readonly id: string;
  readonly currency: import("@prisma/client").Currency;
  /** Decimal Prisma converted to the product's major currency unit. */
  readonly basePrice: number;
  readonly variants: readonly PrismaVariantLike[];
  readonly allowBackorder?: boolean;
  readonly maxQuantityPerOrder?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function attributeValue(attributes: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === "string" || typeof value === "number") {
      const label = String(value).trim();
      if (label) return label;
    }
  }
  return null;
}

function safeInteger(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

/** UUID stable sans dÃ©pendance native, adaptÃ© aux attributs JSON de Prisma. */
function optionId(productId: string, key: string, value: string): string {
  const input = `${productId}:${key.normalize("NFKC").toLowerCase()}:${value.normalize("NFKC").toLowerCase()}`;
  const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

  for (let index = 0; index < input.length; index += 1) {
    const word = index % words.length;
    words[word] = Math.imul(words[word] ^ input.charCodeAt(index), 0x01000193);
  }

  const hex = words.map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const COLOR_HEX: Readonly<Record<string, string>> = {
  noir: "#111827",
  blanc: "#f8fafc",
  rouge: "#dc2626",
  bleu: "#2563eb",
  vert: "#16a34a",
  jaune: "#facc15",
  orange: "#f97316",
  rose: "#ec4899",
  violet: "#7c3aed",
  gris: "#64748b",
  beige: "#d6c7a1",
  marron: "#92400e",
};

function availableStock(stocks: PrismaVariantLike["variantStocks"]): number {
  return stocks.reduce((total, stock) => {
    const available = safeInteger(stock.quantity) - safeInteger(stock.reserved);
    return total + Math.max(0, available);
  }, 0);
}

function getSizeSystem(label: string): "NUMERIC" | "ALPHABETIC" | "FRACTIONAL" {
  if (label.includes("/")) return "FRACTIONAL";
  return /^\s*\d+(?:[.,]\d+)?\s*$/.test(label) ? "NUMERIC" : "ALPHABETIC";
}

function colorOption(productId: string, label: string) {
  return {
    id: optionId(productId, "color", label),
    label,
    hex: COLOR_HEX[label.toLowerCase()] ?? "#64748b",
  };
}

function sizeOption(productId: string, label: string) {
  return {
    id: optionId(productId, "size", label),
    label,
    sizeSystem: getSizeSystem(label),
    sortOrder: 0,
  };
}

/**
 * Convertit les lignes Prisma en configuration sérialisable du sélecteur client.
 * Le JSON `attributes` est volontairement interprété sans cast direct.
 */
export function buildProductVariantConfig(
  input: PrismaProductVariantInput,
): ProductVariantConfig | null {
  if (!Number.isFinite(input.basePrice) || input.basePrice <= 0) return null;

  const activeVariants = input.variants
    .filter((variant) => variant.isActive)
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.sku.localeCompare(b.sku));

  if (activeVariants.length === 0) return null;

  const defaultVariant = activeVariants.find((variant) => availableStock(variant.variantStocks) > 0)
    ?? activeVariants[0];
  const variants = activeVariants.map((variant) => {
    const attributes = asRecord(variant.attributes);
    const color = attributeValue(attributes, ["color", "couleur", "Color", "Couleur"]);
    const size = attributeValue(attributes, ["size", "taille", "Size", "Taille"]);
    const material = attributeValue(attributes, ["material", "matière", "matieres", "Material"]);
    const finish = attributeValue(attributes, ["finish", "finition", "Finish"]);

    return {
      id: variant.id,
      sku: variant.sku,
      priceAdjustment: safeInteger(variant.priceOffset) / 100,
      stockQuantity: availableStock(variant.variantStocks),
      isDefault: variant.id === defaultVariant.id,
      ...(color ? { color: colorOption(input.id, color) } : {}),
      ...(size ? { size: sizeOption(input.id, size) } : {}),
      ...(material ? {
        material: {
          id: optionId(input.id, "material", material),
          label: material,
          ecoFriendly: false,
        },
      } : {}),
      ...(finish ? {
        finish: {
          id: optionId(input.id, "finish", finish),
          label: finish,
        },
      } : {}),
    };
  });

  return {
    productId: input.id,
    basePrice: input.basePrice,
    currency: input.currency,
    variants,
    allowBackorder: input.allowBackorder ?? false,
    maxQuantityPerOrder: Math.max(1, Math.trunc(input.maxQuantityPerOrder ?? 10)),
  };
}

