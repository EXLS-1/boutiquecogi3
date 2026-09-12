// app/admin/products/[productId]/edit/page.tsx — Server Component
// =============================================================================
// ÉDITION PRODUIT — Formulaire pré-rempli depuis ProductService.getDetails
// =============================================================================

import { notFound } from "next/navigation";
import { ProductService } from "@/lib/products/product.service";
import { listProductTypeConfigs } from "@/lib/product-type/product-type.repository";
import { getCategoriesTree } from "@/lib/product-catalog/catalog-queries";
import { getTagsList } from "@/lib/product-catalog/catalog-queries";
import { ProductEditForm } from "@/components/admin/products/product-edit-form";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default async function AdminEditProductPage({ params }: PageProps) {
  const { productId } = await params;
  const [product, types, categories, tags] = await Promise.all([
    ProductService.getDetails(productId),
    listProductTypeConfigs(),
    getCategoriesTree().catch(() => []),
    getTagsList().catch(() => []),
  ]);

  if (!product) notFound();

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ProductEditForm
        productId={productId}
        product={product}
        productTypes={types}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
