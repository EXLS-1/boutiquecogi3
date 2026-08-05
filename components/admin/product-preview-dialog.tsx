"use client";

// components/admin/product-preview-dialog.tsx
// =============================================================================
// ProductPreviewDialog — Aperçu d'un produit (brouillon/pending/scheduled)
// =============================================================================
// Charge /api/product/[id]/preview et affiche le produit comme il apparaîtra
// en boutique, en réutilisant le ProductCard existant.
// =============================================================================

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";

interface ProductPreviewDialogProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

export function ProductPreviewDialog({
  productId,
  productName,
  onClose,
}: ProductPreviewDialogProps) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/product/${productId}/preview`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible de charger l'aperçu");
        }
        const data = await res.json();
        if (!cancelled) setProduct(data.product);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Aperçu — {productName}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Chargement de l&apos;aperçu...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-destructive gap-2">
              <AlertCircle className="h-6 w-6" />
              <span className="text-sm">{error}</span>
            </div>
          ) : product ? (
            <div className="max-w-sm mx-auto">
              <ProductCard product={product} showBadge={false} />
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              Aucun aperçu disponible
            </div>
          )}
        </div>
      </div>
    </div>
);
}
