// app/dashboard/categories/page.tsx
// Gestion des catégories avec RBAC
// Level 4+ (Moderator+) : lecture | Level 3+ (Manager+) : modification

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";

import { CategoryTree } from "@/components/dashboard/categories/category-tree";
import { CategoryStats } from "@/components/dashboard/categories/category-stats";
import { Skeleton } from "@/components/ui/skeleton";

export default async function CategoriesPage() {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in");

  const { level, effectivePermissions } = session;

  if (level > 4) redirect("/unauthorized");

  const canCreate = effectivePermissions.has("categories:create");
  const canUpdate = effectivePermissions.has("categories:update");
  const canDelete = effectivePermissions.has("categories:delete");
  const canReorder = effectivePermissions.has("categories:reorder");

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
          <p className="text-muted-foreground mt-1">
            {categories.length} catégorie{categories.length > 1 ? "s" : ""} · Profondeur max: 3
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <CategoryStats categories={categories} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <CategoryTree
          categories={categories}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canReorder={canReorder}
          maxDepth={3}
        />
      </Suspense>
    </div>
  );
}
