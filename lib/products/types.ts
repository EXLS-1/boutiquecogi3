// lib/products/types.ts

export type AttributeType = "select" | "multiselect" | "string" | "number" | "boolean" | "rich_text";

export interface AttributeTemplate {
  [key: string]: {
    type: AttributeType;
    required: boolean;
    options?: string[];        // Pour select / multiselect
    isVariant: boolean;        // Si true, génère des combinaisons de variants
    indexable: boolean;        // Si true, stocké dans ProductAttributeValue
    min?: number;              // Pour number
    max?: number;              // Pour number
    unit?: string;             // Ex: "cm", "kg"
  };
}

export interface ProductVariantInput {
  attributes: Record<string, string | number | boolean>;
  priceAdjustment?: number;
  initialStock: number;
  images?: string[];
  isDefault?: boolean;
}

export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  compareAtPrice?: number;
  categoryId: string;
  catalogId: string;
  metadata?: Record<string, unknown>;
  attributes: Record<string, string | number | boolean>; // Attributs du produit parent
  variants: ProductVariantInput[]; // Si hasVariants = true, au moins 1 variante
  images?: { url: string; altText?: string; isPrimary?: boolean }[];
}

export interface StockMovementInput {
  variantId: string;
  quantity: number; // positif = entrée, négatif = sortie
  reason: StockReason;
  referenceId?: string;
  referenceType?: string;
  userId?: string;
  notes?: string;
}