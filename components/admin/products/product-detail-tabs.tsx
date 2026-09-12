// components/admin/products/product-detail-tabs.tsx
// =============================================================================
// PRODUCT DETAIL — Contenu des onglets (Server Components)
// =============================================================================

import { Suspense } from "react";
import { getVariantList } from "@/lib/products/product.repository";
import { ProductAnalytics } from "./product-analytics";
import { ProductOverviewCard } from "./product-overview-card";
import { VariantTable } from "./variant-table";
import { ProductPricingManager } from "./pricing-manager";
import { InventoryPanel } from "./inventory-panel";
import { ProductMediaManager } from "./media-manager";
import { ProductCategoryAssignment } from "./category-assignment";
import { ProductTagManager } from "./tag-manager";
import { ProductSeoForm } from "./product-seo-form";
import { ProductStatusHistory } from "./product-status-history";
import { ProductAuditLog } from "./product-audit-log";

export async function TabContent({
  activeTab,
  productId,
  product,
}: {
  activeTab: string;
  productId: string;
  product: any;
}) {
  const baseProps = { productId, product };
  switch (activeTab) {
    case "overview":
      return (
        <Suspense fallback={<div className="text-slate-500">Chargement…</div>}>
          <OverviewTab {...baseProps} />
        </Suspense>
      );
    case "variants":
      return (
        <Suspense fallback={<div>Chargement…</div>}>
          <VariantsTab {...baseProps} />
        </Suspense>
      );
    case "pricing":
      return <PricingTab {...baseProps} />;
    case "inventory":
      return <InventoryTab {...baseProps} />;
    case "media":
      return <MediaTab {...baseProps} />;
    case "categories":
      return <CategoriesTab {...baseProps} />;
    case "tags":
      return <TagsTab {...baseProps} />;
    case "seo":
      return <SeoTab {...baseProps} />;
    case "history":
      return (
        <Suspense fallback={<div>Chargement…</div>}>
          <HistoryTab {...baseProps} />
        </Suspense>
      );
    case "audit":
      return (
        <Suspense fallback={<div>Chargement…</div>}>
          <AuditTab {...baseProps} />
        </Suspense>
      );
    default:
      return <OverviewTab {...baseProps} />;
  }
}

async function OverviewTab({ product, productId }: { product: any; productId: string }) {
  const { getProductAnalytics } = await import("@/lib/products/product.repository");
  const analytics = await getProductAnalytics(productId);
  return (
    <div className="space-y-6">
      <ProductOverviewCard product={product} />
      <ProductAnalytics analytics={analytics} />
    </div>
  );
}

async function VariantsTab({ productId }: { productId: string }) {
  const variants = await getVariantList(productId);
  return <VariantTable variants={variants} productId={productId} />;
}

function PricingTab({ productId }: { productId: string }) {
  return <ProductPricingManager productId={productId} />;
}

function InventoryTab({ productId }: { productId: string }) {
  return <InventoryPanel productId={productId} />;
}

function MediaTab({ productId }: { productId: string }) {
  return <ProductMediaManager productId={productId} />;
}

function CategoriesTab({ productId, product }: { productId: string; product: any }) {
  return <ProductCategoryAssignment productId={productId} product={product} />;
}

function TagsTab({ productId }: { productId: string }) {
  return <ProductTagManager productId={productId} />;
}

function SeoTab({ productId, product }: { productId: string; product: any }) {
  return <ProductSeoForm productId={productId} product={product} />;
}

async function HistoryTab({ productId }: { productId: string }) {
  const { prisma } = await import("@/lib/prisma");
  const history = await prisma.productStatusHistory.findMany({
    where: { productId },
    orderBy: { changedAt: "desc" },
    include: { changedBy: { select: { id: true, name: true } } },
  });
  return <ProductStatusHistory history={history} />;
}

async function AuditTab({ productId }: { productId: string }) {
  const { prisma } = await import("@/lib/prisma");
  const logs = await prisma.auditLog.findMany({
    where: { entityId: productId, entityType: "PRODUCT" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <ProductAuditLog logs={logs} />;
}
