// app/admin/products/catalogs/page.tsx — Server Component
// =============================================================================
// GESTION DES CATALOGUES — Assignment prix, visibilité
// ═════════════════════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma";
import { CatalogManagement } from "@/components/admin/products/catalog-management";

export const metadata = {
  title: "Catalogues | Administration Produits",
  description: "Gérez les catalogues et les prix par catalogue.",
};

export default async function AdminProductCatalogsPage() {
  const catalogs = await prisma.catalog.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Catalogues</h1>
      <CatalogManagement catalogs={JSON.parse(JSON.stringify(catalogs))} />
    </div>
  );
}
