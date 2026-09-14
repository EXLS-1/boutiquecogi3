// components/admin/products/inventory-panel.tsx
// COMPONENT — Panneau de stock d'un produit (onglet "Stock")
// =============================================================================
// Placeholder cohérent avec les autres onglets du portail admin produits.
// =============================================================================

import { Package, RefreshCw } from "lucide-react";

export function InventoryPanel({ productId }: { productId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Stock & inventaire</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Ajuster le stock
        </button>
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Package className="h-4 w-4" />
        Stock et mouvements du produit {productId}.
      </p>
    </div>
  );
}