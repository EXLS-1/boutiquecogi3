// lib/products/types.ts
// =============================================================================
// TYPES DTO — Ajout dynamique de produits au stock
// =============================================================================
// Payload « minimaliste » → « ultra-complet » :
//   - { name, basePrice }                    → produit simple (variante implicite)
//   - { name, basePrice, description,
//      categoryId, attributes, variants[] }  → matrice taille/couleur/...
// Le stock est TOUJOURS créé (jamais de produit statique sans inventaire).

export type ProductCurrency = "USD" | "CDF";

export type DynamicAttributeValue = string | number | boolean;
export type DynamicAttributes = Record<string, DynamicAttributeValue>;

/** Variante de produit (déclinaison taille/couleur/…). */
export interface VariantInputDto {
  /** SKU optionnel — généré automatiquement côté serveur si absent. */
  sku?: string;
  /** Attributs distinctifs : { taille: "XL", couleur: "Rouge" }. */
  attributes: DynamicAttributes;
  /** Écart de prix en centimes par rapport au prix de base (ex: +500 = +5,00). */
  priceOffset?: number;
  /** Stock initial attribué à cette variante. */
  initialStock: number;
}

/** Produit dynamique : tous les critères sont facultatifs sauf name + basePrice. */
export interface CreateProductDto {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  basePrice: number;
  currency?: ProductCurrency;
  /** Prix comparative (barré) en centimes — persisté dans ProductPrice. */
  compareAtPrice?: number | null;
  /** Attributs arbitraires du produit parent (ex: { matiere: "Coton" }). */
  attributes?: DynamicAttributes;
  /** Variantes. Absent ⇒ produit simple : une variante implicite unique est créée. */
  variants?: VariantInputDto[];
  images?: string[];
}

/** Résultat renvoyé par le service de création. */
export interface CreatedProductResult {
  productId: string;
  variantCount: number;
  totalStock: number;
  slug: string;
}

/** Mouvement de stock rattaché à une variante. */
export interface StockMovementInput {
  variantId: string;
  /** > 0 = entrée (restock), < 0 = sortie (vente / ajustement). */
  quantity: number;
  reason: string;
  referenceId?: string | null;
  referenceType?: string | null;
  userId?: string | null;
  notes?: string | null;
}