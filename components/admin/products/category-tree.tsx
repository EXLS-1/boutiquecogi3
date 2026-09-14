// components/admin/products/category-tree.tsx
// COMPONENT — Arbre de catégories (portail admin produits)
// =============================================================================
// Affiche la hiérarchie des catégories (parentId → enfants) avec le nombre de
// produits rattachés, tel que fourni par `getCategoriesTree()` (lib/product-catalog).
// =============================================================================

"use client";

import { FolderTree, Package } from "lucide-react";

/** Ligne d'arbre retournée par `getCategoriesTree()`. */
export interface AdminCategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: number;
  productCount: number;
}

type CategoryTreeProps = {
  categories: AdminCategoryNode[];
};

export function CategoryTree({ categories }: CategoryTreeProps) {
  const byId = new Set(categories.map((c) => c.id));

  // Racines = nœuds sans parent, ou dont le parent est absent de la liste.
  const roots = categories.filter(
    (c) => c.parentId === null || !byId.has(c.parentId),
  );

  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
        <FolderTree className="w-10 h-10" aria-hidden />
        <p className="text-sm">
          Aucune catégorie — créez votre première catégorie.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-700">
          {categories.length} catégorie{categories.length > 1 ? "s" : ""}
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {roots.map((node) => (
          <CategoryNode
            key={node.id}
            node={node}
            categories={categories}
            depth={0}
          />
        ))}
      </ul>
    </div>
  );
}

function CategoryNode({
  node,
  categories,
  depth,
}: {
  node: AdminCategoryNode;
  categories: AdminCategoryNode[];
  depth: number;
}) {
  const children = categories.filter((c) => c.parentId === node.id);

  return (
    <li>
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate text-sm font-medium text-slate-800">
            {node.name}
          </span>
          {node.children > 0 && (
            <span className="shrink-0 text-xs text-slate-400">
              {node.children} sous-catégorie{node.children > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
          <Package className="h-3 w-3" aria-hidden />
          {node.productCount} produit{node.productCount > 1 ? "s" : ""}
        </span>
      </div>

      {children.length > 0 && (
        <ul className="ml-4 border-l border-slate-100">
          {children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              categories={categories}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}