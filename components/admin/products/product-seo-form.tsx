// components/admin/products/product-seo-form.tsx
// COMPONENT — Formulaire de référencement (SEO) d'un produit (onglet "SEO")
// =============================================================================
// Affiche les champs SEO du produit (titre/meta description). Placeholder de
// saisie cohérent avec les autres onglets du portail admin produits.
// =============================================================================

import { Save, TrendingUp } from "lucide-react";

type ProductSeoShape = {
  id: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export function ProductSeoForm({
  productId,
  product,
}: {
  productId: string;
  product?: ProductSeoShape | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Référencement (SEO)</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Save className="w-4 h-4" />
          Enregistrer
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Titre SEO</label>
          <input
            readOnly
            defaultValue={product?.seoTitle ?? ""}
            placeholder="Titre optimisé pour les moteurs de recherche"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Méta description</label>
          <textarea
            readOnly
            defaultValue={product?.seoDescription ?? ""}
            rows={4}
            placeholder="Description courte pour les moteurs de recherche"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <TrendingUp className="h-4 w-4" />
        Formulaire SEO du produit {productId}.
      </p>
    </div>
  );
}