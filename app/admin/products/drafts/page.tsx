// app/admin/products/drafts/page.tsx
import { prisma } from "@/lib/prisma";
import { DraftManager } from "@/components/admin/products/draft-manager";

export const metadata = {
  title: "Brouillons & Validation | Administration Produits",
  description: "Soumettez, approuvez, programmez ou archivez les produits.",
};

export default async function AdminProductDraftsPage() {
  const products = await prisma.product.findMany({
    where: {
      isdeleted: false,
      status: { in: ["DRAFT", "PENDING", "SCHEDULED"] },
    },
    include: {
      productType: { select: { type: true, label: true, requiresApproval: true } },
      productImages: { take: 1, select: { url: true } },
      stock: { select: { quantity: true, reserved: true } },
      _count: { select: { variants: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Brouillons &amp; Validation</h1>
      <DraftManager products={JSON.parse(JSON.stringify(products))} />
    </div>
  );
}
