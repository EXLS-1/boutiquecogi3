// components/dashboard/widgets/top-products.tsx
// ============================================
// WIDGET : PRODUITS LES PLUS VENDUS
// Permissions: products:read + analytics:read
// Niveaux: LEVEL 1-4 (Super-Admin → Editor)
// ============================================

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasAllPermissions,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  formatCurrency,
  formatNumber,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import { Package, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface TopProduct {
  id: string;
  name: string;
  sku: string | null;
  sold: number;
  revenue: number;
  imageUrl: string | null;
}

// ───────────────────────────────────────────
// DATA FETCHING (ATOMIQUE)
// ───────────────────────────────────────────

async function fetchTopProducts(limit: number = 6): Promise<TopProduct[]> {
  const products = await prisma.product.findMany({
    take: limit,
    orderBy: { soldCount: "desc" },
    select: {
      id: true,
      name: true,
      sku: true,
      soldCount: true,
      images: true,
      // Le modèle Product n'a pas de champ `price` scalaire : les prix vivent
      // dans la relation ProductPrice (1:N). On récupère la ligne de prix la
      // plus récente (par startsAt, sans prix futur/planifié en tête).
      productPrice: {
        select: { amount: true },
        orderBy: { startsAt: { sort: "desc", nulls: "last" } },
        take: 1,
      },
    },
    where: {
      soldCount: { gt: 0 },
      isActive: true,
    },
  });

  return products.map((product) => {
    const unitPrice = Number(product.productPrice[0]?.amount ?? 0);

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sold: product.soldCount ?? 0,
      revenue: (product.soldCount ?? 0) * unitPrice,
      imageUrl: product.images[0] ?? null,
    };
  });
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function TopProductsContent({
  className,
  limit = 6,
}: WidgetProps & { limit?: number }) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Top produits" />;
  }

  const { role } = userData;
  const allowed = await hasAllPermissions(role, [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ANALYTICS_READ,
  ]);

  if (!allowed) {
    return <WidgetForbidden title="Top produits" />;
  }

  const products = await fetchTopProducts(limit);
  const maxSold = Math.max(...products.map((p) => p.sold), 1);

  return (
    <WidgetShell title="Produits les plus vendus" icon={Package} className={className}>
      <div className="space-y-4">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune vente enregistrée.
          </p>
        ) : (
          products.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3 group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="text-sm font-medium truncate hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="text-xs font-medium tabular-nums">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={(product.sold / maxSold) * 100}
                    className="h-1.5 flex-1"
                  />
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    {formatNumber(product.sold)}
                  </Badge>
                </div>
                {product.sku && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    SKU: {product.sku}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function TopProducts({
  className,
  limit,
}: WidgetProps & { limit?: number }) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={5} />}>
      <TopProductsContent className={className} limit={limit} />
    </Suspense>
  );
}
