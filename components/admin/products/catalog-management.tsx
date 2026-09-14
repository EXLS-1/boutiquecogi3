// components/admin/products/catalog-management.tsx
// COMPONENT — Gestion des catalogues (portail admin produits)
// =============================================================================
// Affiche la liste des catalogues avec le nombre de produits rattachés.
// =============================================================================

"use client";

import { Plus, ShoppingBag } from "lucide-react";

type CatalogItem = {
  id: string;
  name: string;
  imageSrc?: string | null;
  imageAlt?: string | null;
  isActive: boolean;
  _count?: { products: number };
};

type CatalogManagementProps = {
  catalogs: CatalogItem[];
};

export function CatalogManagement({ catalogs }: CatalogManagementProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Catalogues</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau catalogue
        </button>
      </div>

      {catalogs.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun catalogue. Créez votre premier catalogue.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {catalogs.map((catalog) => (
            <li
              key={catalog.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <ShoppingBag
                    className="h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium text-slate-800">
                    {catalog.name}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    catalog.isActive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {catalog.isActive ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {catalog._count?.products ?? 0} produit
                {(catalog._count?.products ?? 0) > 1 ? "s" : ""} attaché
                {(catalog._count?.products ?? 0) > 1 ? "s" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}