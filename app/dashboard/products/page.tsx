// app/dashboard/products/page.tsx
// Gestion des produits avec RBAC
// Level 5+ (Seller+) : CRUD produits | Level 3+ (Manager+) : import/export

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { ProductsTable } from "@/components/dashboard/products/products-table";
import { ProductFilters } from "@/components/dashboard/products/product-filters";
import { ProductActionBar } from "@/components/dashboard/products/product-action-bar";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductsPageProps {
  searchParams: Promise<{
    type?: string; category?: string; status?: string; search?: string; page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/signin");

  const { level, effectivePermissions } = session;
  const params = await searchParams;

  // Level minimum 5 (Seller)
  if (level > 5) redirect("/unauthorized");

  const canCreate = effectivePermissions.has("products:create");
  const canDelete = effectivePermissions.has("products:delete");
  const canImport = level <= 3 && effectivePermissions.has("products:import");
  const canExport = level <= 3 && effectivePermissions.has("products:export");
  const canManageVariants = effectivePermissions.has("products:manage_variants");
  const canManageReviews = effectivePermissions.has("products:manage_reviews");

  const page = parseInt(params.page || "1");
  const limit = 20;

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

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        variants: { select: { id: true } },
        _count: { select: { reviews: true, orderItems: true } },
      },
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
            {total} produit{total > 1 ? "s" : ""} · Level {level}
          </p>
        </div>
        <ProductActionBar canCreate={canCreate} canImport={canImport} canExport={canExport} />
      </div>

      <Suspense fallback={<Skeleton className="h-16" />}>
        <ProductFilters categories={categories} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProductsTable
          products={products}
          total={total}
          page={page}
          limit={limit}
          canDelete={canDelete}
          canManageVariants={canManageVariants}
          canManageReviews={canManageReviews}
        />
      </Suspense>
    </div>
  );
}
