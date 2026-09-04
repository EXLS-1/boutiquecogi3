// hooks/use-create-product.ts
// =============================================================================
// HOOK CLIENT — Création dynamique d'un produit (minimal → matrice complète)
// =============================================================================
// Consomme POST /api/admin/products (transaction atomique côté serveur).
// Typé de bout en bout, zéro état partagé, gère loading/erreur/fieldErrors.

"use client";

import { useCallback, useState } from "react";
import type { Currency } from "@prisma/client";

// ─── Types (alignés sur lib/products/types.ts) ───────────────────────────────

export type DynamicAttributeValue = string | number | boolean;

export interface CreateProductVariantPayload {
  /** Optionnel — généré côté serveur si absent. */
  sku?: string;
  /** Attributs distinctifs : { taille: "XL", couleur: "Rouge" } */
  attributes: Record<string, DynamicAttributeValue>;
  /** Écart de prix en centimes vs prix de base (ex: +500 = +5,00). */
  priceOffset?: number;
  /** Stock initial de cette variante. */
  initialStock: number;
}

export interface CreateProductPayload {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  basePrice: number;
  currency?: Currency;
  /** Attributs libres du produit (ex: { matiere: "Coton" }). */
  attributes?: Record<string, DynamicAttributeValue>;
  /** Absent ⇒ produit simple : une variante implicite unique est créée. */
  variants?: CreateProductVariantPayload[];
  images?: string[];
}

export interface CreatedProductData {
  productId: string;
  variantCount: number;
  totalStock: number;
  slug: string;
}

interface UseCreateProductReturn {
  isPending: boolean;
  error: string | null;
  errorCode: string | null;
  fieldErrors: Record<string, string[]> | null;
  data: CreatedProductData | null;
  createProduct: (payload: CreateProductPayload) => Promise<boolean>;
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCreateProduct(): UseCreateProductReturn {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [data, setData] = useState<CreatedProductData | null>(null);

  const createProduct = useCallback(async (payload: CreateProductPayload): Promise<boolean> => {
    setIsPending(true);
    setError(null);
    setErrorCode(null);
    setFieldErrors(null);
    setData(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json.error ?? "Échec de la création du produit.");
        setErrorCode(json.code ?? "UNKNOWN_ERROR");
        setFieldErrors((json.details?.fieldErrors as Record<string, string[]> | undefined) ?? null);
        return false;
      }

      setData(json.data as CreatedProductData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau inattendue.");
      setErrorCode("NETWORK_ERROR");
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setErrorCode(null);
    setFieldErrors(null);
    setData(null);
  }, []);

  return { isPending, error, errorCode, fieldErrors, data, createProduct, reset };
}