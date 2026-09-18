// app/dashboard/products/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSessionWithUser,
  resolveEffectivePermissions,
  getClientPermissions,
} from "@/lib/auth/rbac";

import { ProductFilters } from "@/components/dashboard/products/product-filters";
import { ProductActionBar } from "@/components/dashboard/products/product-action-bar";
import { ProductSelectionWrapper } from "@/components/dashboard/products/product-selection-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductsPageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const session = await getSessionWithUser();
  if (!session) redirect("/auth/sign-in");

  const { role, level } = session;
  const params = await searchParams;

  if (level > 5) {
    redirect("/unauthorized");
  }

  const effectivePermissions = await resolveEffectivePermissions(role);

  const canCreate = effectivePermissions.has("products:create");
  const canDelete = effectivePermissions.has("products:delete");
  const canImport = level <= 3 && effectivePermissions.has("products:import");
  const canExport = level <= 3 && effectivePermissions.has("products:export");
  const canManageVariants = effectivePermissions.has("products:manage_variants");
  const canManageReviews = effectivePermissions.has("products:manage_reviews");

  const clientPermissionsArray = await getClientPermissions(role);

  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 20;

  const where = {
    ...(params.category && { categoryId: params.category }),
    ...(params.status && { status: params.status as ProductStatus }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" as const } },
        { description: { contains: params.search, mode: "insensitive" as const } },
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
        _count: { select: { productReviews: true, orderItems: true } },
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
            {total} produit{total > 1 ? "s" : ""} · Niveau {level} ({role})
          </p>
        </div>
        <ProductActionBar canCreate={canCreate} canImport={canImport} canExport={canExport} />
      </div>

      <Suspense fallback={<Skeleton className="h-16" />}>
        <ProductFilters categories={categories} />
      </Suspense>

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
