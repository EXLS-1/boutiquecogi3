// components/admin/products/pricing-manager.tsx
import { Currency, ProductPrice } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";

export function ProductPricingManager({ productId }: { productId: string }) {
  // Placeholder — pricing manager (ProductPrice CRUD)
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des prix</h3>
        <button className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm">
          <Plus className="w-4 h-4" />
          Ajouter un prix
        </button>
      </div>
      <p className="text-slate-500 text-sm">Gestion des prix ProductPrice pour le produit {productId}.</p>
    </div>
  );
}
