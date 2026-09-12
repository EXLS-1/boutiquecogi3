// app/admin/products/tags/page.tsx
import { getTagsList } from "@/lib/product-catalog/catalog-queries";
import { TagManager } from "@/components/admin/products/tag-management";

export const metadata = { title: "Tags | Administration Produits" };

export default async function AdminProductTagsPage() {
  const tags = await getTagsList();
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Gestion des tags</h1>
      <TagManager tags={tags} />
    </div>
  );
}
