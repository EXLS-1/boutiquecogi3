// app/admin/products/inventory/page.tsx
import { prisma } from "@/lib/prisma";
import { InventoryDashboard } from "@/components/admin/products/inventory-dashboard";

export const metadata = { title: "Inventaire | Administration Produits" };

export default async function AdminProductInventoryPage() {
  const data = await prisma.product.findMany({
    where: { isdeleted: false },
    select: {
      id: true, name: true, sku: true,
      stock: { select: { quantity: true, reserved: true } },
      availabilityProjection: { select: { isAvailable: true } },
      variants: { select: { variantStocks: { select: { quantity: true, reserved: true } } } },
    },
    take: 50,
  });
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Gestion de l'inventaire</h1>
      <InventoryDashboard data={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}
