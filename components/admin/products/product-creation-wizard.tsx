// components/admin/products/product-creation-wizard.tsx
// COMPONENT — Assistant de création de produit — portail admin
// =============================================================================
// Formulaire de création (nom, prix, type, catégories, tags).
// /* placeholder */ Persistance à brancher sur les server actions de création.
// =============================================================================

"use client";

import { Plus, Rocket } from "lucide-react";

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

type ProductCreationWizardProps = {
  productTypes: ProductTypeItem[];
  categories: CategoryItem[];
  tags: TagItem[];
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function ProductCreationWizard({
  productTypes,
  categories,
  tags,
}: ProductCreationWizardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Rocket className="h-6 w-6 text-slate-700" />
          Nouveau produit
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Créer le produit
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">Détails</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom *</label>
            <input type="text" placeholder="Nom du produit" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Prix de base (centimes) *
            </label>
            <input type="number" min={0} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type de produit
            </label>
            <select className={inputClass} defaultValue="">
              <option value="" disabled>
                Sélectionner un type
              </option>
              {productTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700">
            Catégories & tags
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Catégories
            </label>
            <p className="mt-1 text-sm text-slate-500">
              {categories.length} catégorie(s) disponible(s).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tags
            </label>
            <p className="mt-1 text-sm text-slate-500">
              {tags.length} tag(s) disponible(s).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}