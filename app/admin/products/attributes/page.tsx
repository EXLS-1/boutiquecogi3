// app/admin/products/attributes/page.tsx
import { prisma } from "@/lib/prisma";
import { AttributeManager } from "@/components/admin/products/attribute-manager";

export const metadata = { title: "Attributs | Administration Produits" };

export default async function AdminProductAttributesPage() {
  const data = await prisma.productAttribute.findMany({
    include: { values: { include: { productAttributeValues: true } } },
    orderBy: { name: "asc" },
  });
  const configs = await prisma.variantAttributeConfig.findMany({ orderBy: { attribute: "asc" } });
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Attributs &amp; options</h1>
      <AttributeManager attributes={JSON.parse(JSON.stringify(data))} variantConfigs={JSON.parse(JSON.stringify(configs))} />
    </div>
  );
}
