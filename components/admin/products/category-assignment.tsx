// components/admin/products/category-assignment.tsx
// COMPONENT — Assignation des catégories d'un produit (onglet "Catégories")
// =============================================================================
// Affiche les catégories actuellement rattachées au produit et permet (à venir)
// d'en assigner/retirer via les server actions `assignCategoryAction` /
// `removeCategoryAction`. Les boutons sont des placeholders cohérents avec les
// autres onglets du portail (ex: pricing-manager).
// =============================================================================

import { LayoutGrid, Plus, X } from "lucide-react";

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  displayOrder?: number;
};

type ProductLike = {
  id: string;
  categories?: ProductCategory[];
};

export function ProductCategoryAssignment({
  productId,
  product,
}: {
  productId: string;
  product?: ProductLike | null;
}) {
  const categories = product?.categories ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des catégories</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Assigner une catégorie
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucune catégorie assignée au produit {productId}.
        </p>
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                <LayoutGrid className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{category.name}</span>
              </span>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500 hover:text-rose-600"
              >
                <X className="h-3 w-3" />
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}