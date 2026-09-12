// app/admin/products/new/page.tsx — Server Component
// =============================================================================
// WIZARD DE CRÉATION — Produit + variantes + prix + stock + médias + SEO
// =============================================================================

import { listProductTypeConfigs } from "@/lib/product-type/product-type.repository";
import { getCategoriesTree } from "@/lib/product-catalog/catalog-queries";
import { getTagsList } from "@/lib/product-catalog/catalog-queries";
import { ProductCreationWizard } from "@/components/admin/products/product-creation-wizard";

export const metadata = {
  title: "Nouveau produit | Administration",
  description: "Créer un nouveau produit avec ses variantes, prix et stock.",
};

export default async function AdminNewProductPage() {
  const [types, categories, tags] = await Promise.all([
    listProductTypeConfigs(),
    getCategoriesTree().catch(() => []),
    getTagsList().catch(() => []),
  ]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ProductCreationWizard
        productTypes={types}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
