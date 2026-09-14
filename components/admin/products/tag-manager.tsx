// components/admin/products/tag-manager.tsx
// COMPONENT — Gestion des tags d'un produit (onglet "Tags")
// =============================================================================
// Placeholder cohérent avec les autres onglets du portail admin produits.
// =============================================================================

import { Plus, Tag } from "lucide-react";

export function ProductTagManager({ productId }: { productId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des tags</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un tag
        </button>
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Tag className="h-4 w-4" />
        Gestion des tags pour le produit {productId}.
      </p>
    </div>
  );
}