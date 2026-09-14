// components/admin/products/media-manager.tsx
// COMPONENT — Gestion des médias d'un produit (onglet "Médias")
// =============================================================================
// Placeholder cohérent avec les autres onglets du portail admin produits.
// =============================================================================

import { Image as ImageIcon, Plus } from "lucide-react";

export function ProductMediaManager({ productId }: { productId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des médias</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un média
        </button>
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <ImageIcon className="h-4 w-4" />
        Images et médias du produit {productId}.
      </p>
    </div>
  );
}