// app/dashboard/products/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server"; 
import { prisma } from "@/lib/prisma";

import { ProductFilters } from "@/components/dashboard/product/product-filters";
import { ProductActionBar } from "@/components/dashboard/product/product-action-bar";
import { ProductSelectionWrapper } from "@/components/dashboard/product/product-selection-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientPermissions } from "@/lib/auth/rbac";
import { dashboardProductArgs } from "@/types/prisma";

interface ProductsPageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: number;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // 1. Récupération de la session RBAC Server-Side
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/signin");

  const { level, effectivePermissions, role } = session;
  const params = await searchParams;

  /**
   * SÉCURITÉ CONSOLIDÉE SUR LA HIÉRARCHIE INVERSÉE :
   * Level 1 = SUPER_ADMIN (Pouvoir max) -> Level 6 = USER (Pouvoir min)
   * Si level > 5 (ex: Level 6 USER), l'accès est strictement refusé.
   */
  if (level > 5) {
    redirect("/unauthorized");
  }

  // 2. Évaluation des droits fins basée sur vos permissions effectives
  const canCreate = effectivePermissions.has("products:create");
  const canDelete = effectivePermissions.has("products:delete");
  
  // Seuls les rôles de niveau 1, 2 ou 3 ont accès à l'import/export
  const canImport = level <= 3 && effectivePermissions.has("products:import");
  const canExport = level <= 3 && effectivePermissions.has("products:export");
  
  const canManageVariants = effectivePermissions.has("products:manage_variants");
  const canManageReviews = effectivePermissions.has("products:manage_reviews");

  // Transformation du Set de permissions en Array pour le passage sécurisé aux Client Components
  const clientPermissionsArray = await getClientPermissions(role);

  const page = parseInt(params.page || "1");
  const limit = 20;

  // 3. Clause WHERE sécurisée avec typage de recherche insensible à la casse
  const where = {
    ...(params.type && { type: params.type }),
    ...(params.category && { categoryId: params.category }),
    ...(params.status && { status: params.status }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ],
    }),
  };

  // 4. Extraction de données optimisée (requêtes parallèles)
  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      ...dashboardProductArgs,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground mt-1">
            {total} produit{total > 1 ? "s" : ""} · Niveau {level} ({role})
          </p>
        </div>
        <ProductActionBar canCreate={canCreate} canImport={canImport} canExport={canExport} />
      </div>

      <Suspense fallback={<Skeleton className="h-16" />}>
        <ProductFilters categories={categories} />
      </Suspense>

      {/* Orchestrateur client de l'état partagé (selectedIds) */}
      <ProductSelectionWrapper
        products={products}
        total={total}
        page={page}
        limit={limit}
        canDelete={canDelete}
        canManageVariants={canManageVariants}
        canManageReviews={canManageReviews}
        clientPermissions={clientPermissionsArray}
        userLevel={level}
      />
    </div>
  );
}