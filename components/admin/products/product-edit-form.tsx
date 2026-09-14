// components/admin/products/product-edit-form.tsx
// COMPONENT — Formulaire d'édition d'un produit (pré-rempli) — portail admin
// =============================================================================
// Affiche un formulaire pré-rempli à partir des données de ProductService.getDetails.
// /* placeholder */ Les champs sont en lecture seule : persistance à brancher
// sur les server actions d'édition produit.
// =============================================================================

"use client";

import { Save } from "lucide-react";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: number;
  productCount: number;
};

type TagItem = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

type ProductTypeItem = {
  id: string;
  type: string;
  label: string;
};

type ProductFormData = {
  id: string;
  name?: string | null;
  sku?: string | null;
  slug?: string | null;
  description?: string | null;
  basePrice?: number | null;
  currency?: string | null;
  status?: string | null;
  isActive?: boolean | null;
};

type ProductEditFormProps = {
  productId: string;
  product: ProductFormData | null;
  productTypes: ProductTypeItem[];
  categories: CategoryItem[];
  tags: TagItem[];
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function ProductEditForm({
  productId,
  product,
  productTypes,
  categories,
  tags,
}: ProductEditFormProps) {
  const basePrice = product?.basePrice ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Éditer le produit
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm"
        >
          <Save className="w-4 h-4" />
          Enregistrer
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">
            Informations générales
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom *</label>
            <input readOnly defaultValue={product?.name ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">SKU</label>
            <input readOnly defaultValue={product?.sku ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Slug</label>
            <input readOnly defaultValue={product?.slug ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type de produit
            </label>
            <p className="mt-1 text-sm text-slate-500">
              {productTypes.filter((t) => t.id === product?.id).length
                ? "Sélectionné"
                : `${productTypes.length} type(s) configuré(s)`}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">
            Prix & statut
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Prix de base (centimes)
            </label>
            <input readOnly defaultValue={basePrice} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Statut
            </label>
            <p className="mt-1 text-sm text-slate-500">
              {product?.status ?? "—"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              readOnly
              rows={5}
              defaultValue={product?.description ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">Catégories</h3>
          <p className="mt-2 text-sm text-slate-500">
            {categories.length} catégorie(s) disponible(s) pour l&apos;
            assignation.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">Tags</h3>
          <p className="mt-2 text-sm text-slate-500">
            {tags.length} tag(s) disponible(s).
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Édition du produit {productId}.
      </p>
    </div>
  );
}