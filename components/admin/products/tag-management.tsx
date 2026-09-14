// components/admin/products/tag-management.tsx
// COMPONENT — Gestion des tags (portail admin produits)
// =============================================================================
// Affiche la liste des tags avec le compteur de produits rattachés.
// =============================================================================

"use client";

import { Plus, Tag } from "lucide-react";

type TagItem = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

type TagManagementProps = {
  tags: TagItem[];
};

export function TagManager({ tags }: TagManagementProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tags</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un tag
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun tag. Créez votre premier tag.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                <Tag className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate font-medium">{tag.name}</span>
                <code className="shrink-0 text-xs text-slate-400">{tag.slug}</code>
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {tag.productCount} produit{tag.productCount > 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}