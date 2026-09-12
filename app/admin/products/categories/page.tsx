// app/admin/products/categories/page.tsx — Server Component
// =============================================================================
// GESTION DES CATÉGORIES — Arbre, CRUD, drag & drop
// ═════════════════════════════════════════════════════════════════════════════

import { getCategoriesTree } from "@/lib/product-catalog/catalog-queries";
import { CategoryTree } from "@/components/admin/products/category-tree";

export const metadata = {
  title: "Catégories | Administration Produits",
  description: "Gérez l'arbre des catégories produit.",
};

export default async function AdminProductCategoriesPage() {
  const categories = await getCategoriesTree();
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Catégories</h1>
      <CategoryTree categories={categories} />
    </div>
  );
}
