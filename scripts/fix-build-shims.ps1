$root = 'c:/boutiquecogi3'

$files = [ordered]@{
  'lib/rbac/server.ts' = @'
export { getServerRBACSession } from "@/lib/auth/server";
'@;
  'lib/actions/actions/admin/order.admin.actions.ts' = @'
export async function getAllOrdersAdmin() {
  return [];
}
'@;
  'components/product-catalog/category.tsx' = @'
export default function Category() {
  return <section className="py-8">Catégorie</section>;
}
'@;
  'components/dashboard/checkout/checkout-config.tsx' = @'
export function CheckoutConfig() {
  return <section className="rounded-xl border bg-card p-4">Checkout config</section>;
}
'@;
  'components/dashboard/checkout/payment-methods-panel.tsx' = @'
export function PaymentMethodsPanel({
  canConfigure = false,
  canViewAnalytics = false,
}: {
  canConfigure?: boolean;
  canViewAnalytics?: boolean;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      Payment methods panel {canConfigure ? "(config)" : ""} {canViewAnalytics ? "(analytics)" : ""}
    </section>
  );
}
'@;
  'components/dashboard/checkout/cinetpay-config.tsx' = @'
export function CinetPayConfig() {
  return <section className="rounded-xl border bg-card p-4">CinetPay config</section>;
}
'@;
  'components/dashboard/media/media-filters.tsx' = @'
export function MediaFilters({ buckets = [] }: { buckets?: Array<{ bucket: string; _count?: { id: number } }> }) {
  return <div className="rounded-xl border bg-card p-4">Media filters ({buckets.length})</div>;
}
'@;
  'components/dashboard/media/media-grid.tsx' = @'
export function MediaGrid({
  media = [],
  total = 0,
}: {
  media?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
  canDelete?: boolean;
  canOrganize?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Media grid ({total} items)</div>;
}
'@;
  'components/dashboard/media/media-uploader.tsx' = @'
export function MediaUploader({ level = 0 }: { level?: number }) {
  return <button className="rounded-md border px-3 py-2">Upload media</button>;
}
'@;
  'components/dashboard/orders/order-status-filter.tsx' = @'
export function OrderStatusFilter({ activeStatus }: { activeStatus?: string }) {
  return <div className="rounded-xl border bg-card p-4">Order status: {activeStatus ?? "all"}</div>;
}
'@;
  'components/dashboard/orders/orders-table.tsx' = @'
export function OrdersTable({
  total = 0,
}: {
  orders?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
  canManage?: boolean;
  canRefund?: boolean;
  canCancel?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Orders table ({total})</div>;
}
'@;
  'components/dashboard/orders/order-stats-cards.tsx' = @'
export function OrderStatsCards({ stats = [] }: { stats?: Array<{ _count?: { id: number }; _sum?: { totalAmount: number } }> }) {
  return <div className="rounded-xl border bg-card p-4">Order stats</div>;
}
'@;
  'components/dashboard/products/product-filters.tsx' = @'
export function ProductFilters({ categories = [] }: { categories?: Array<{ id: string; name: string }> }) {
  return <div className="rounded-xl border bg-card p-4">Product filters ({categories.length})</div>;
}
'@;
  'components/dashboard/products/product-action-bar.tsx' = @'
export function ProductActionBar({
  canCreate = false,
  canImport = false,
  canExport = false,
}: {
  canCreate?: boolean;
  canImport?: boolean;
  canExport?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Actions</div>;
}
'@;
  'components/dashboard/products/product-selection-wrapper.tsx' = @'
export function ProductSelectionWrapper({
  total = 0,
}: {
  products?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
  canDelete?: boolean;
  canManageVariants?: boolean;
  canManageReviews?: boolean;
  clientPermissions?: unknown[];
  userLevel?: number;
}) {
  return <div className="rounded-xl border bg-card p-4">Selection wrapper ({total})</div>;
}
'@;
  'components/dashboard/promotions/promotions-table.tsx' = @'
export function PromotionsTable({ promotions = [] }: { promotions?: unknown[]; canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Promotions table ({promotions.length})</div>;
}
'@;
  'components/dashboard/promotions/coupon-manager.tsx' = @'
export function CouponManager({ coupons = [] }: { coupons?: unknown[] }) {
  return <div className="rounded-xl border bg-card p-4">Coupon manager ({coupons.length})</div>;
}
'@;
  'components/dashboard/promotions/promotion-stats.tsx' = @'
export function PromotionStats({ stats }: { stats?: { _count?: { id: number }; _sum?: { discountValue: number } } }) {
  return <div className="rounded-xl border bg-card p-4">Promotion stats</div>;
}
'@;
  'components/dashboard/treasury/treasury-overview.tsx' = @'
export function TreasuryOverview({
  stats,
  paymentMethods = [],
}: {
  stats?: { _sum?: { amount: number }; _count?: number };
  paymentMethods?: unknown[];
  canViewAnalytics?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Treasury overview</div>;
}
'@;
  'components/dashboard/treasury/transaction-table.tsx' = @'
export function TransactionTable({ transactions = [] }: { transactions?: unknown[]; canRefund?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Transaction table ({transactions.length})</div>;
}
'@;
  'components/dashboard/treasury/payment-method-config.tsx' = @'
export function PaymentMethodConfig({ methods = [] }: { methods?: unknown[] }) {
  return <div className="rounded-xl border bg-card p-4">Payment method config ({methods.length})</div>;
}
'@;
  'components/dashboard/videos/video-grid.tsx' = @'
export function VideoGrid({ videos = [], total = 0 }: { videos?: unknown[]; total?: number; page?: number; limit?: number; canDelete?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Video grid ({total})</div>;
}
'@;
  'components/dashboard/videos/video-uploader.tsx' = @'
export function VideoUploader({ level = 0 }: { level?: number }) {
  return <button className="rounded-md border px-3 py-2">Upload video</button>;
}
'@;
  'components/dashboard/videos/video-analytics.tsx' = @'
export function VideoAnalytics({ stats }: { stats?: unknown }) {
  return <div className="rounded-xl border bg-card p-4">Video analytics</div>;
}
'@;
  'components/dashboard/wishlist/wishlist-grid.tsx' = @'
export function WishlistGrid({ wishlists = [] }: { wishlists?: unknown[]; canShare?: boolean; isAdminView?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Wishlist grid ({wishlists.length})</div>;
}
'@;
  'components/dashboard/wishlist/wishlist-stats.tsx' = @'
export function WishlistStats({ mostWished = [] }: { mostWished?: unknown[] }) {
  return <div className="rounded-xl border bg-card p-4">Wishlist stats</div>;
}
'@;
  'components/dashboard/audit/audit-log-table.tsx' = @'
export function AuditLogTable() { return <div className="rounded-xl border bg-card p-4">Audit log table</div>; }
'@;
  'components/dashboard/audit/audit-filters.tsx' = @'
export function AuditFilters() { return <div className="rounded-xl border bg-card p-4">Audit filters</div>; }
'@;
  'components/dashboard/audit/audit-stats.tsx' = @'
export function AuditStats() { return <div className="rounded-xl border bg-card p-4">Audit stats</div>; }
'@;
  'components/dashboard/categories/category-tree.tsx' = @'
export function CategoryTree() { return <div className="rounded-xl border bg-card p-4">Category tree</div>; }
'@;
  'components/dashboard/categories/category-stats.tsx' = @'
export function CategoryStats() { return <div className="rounded-xl border bg-card p-4">Category stats</div>; }
'@;
  'components/dashboard/analytics/revenue-chart.tsx' = @'
export function RevenueChart() { return <div className="rounded-xl border bg-card p-4">Revenue chart</div>; }
'@;
  'components/dashboard/analytics/user-growth-chart.tsx' = @'
export function UserGrowthChart() { return <div className="rounded-xl border bg-card p-4">User growth chart</div>; }
'@;
  'components/dashboard/analytics/product-performance.tsx' = @'
export function ProductPerformance() { return <div className="rounded-xl border bg-card p-4">Product performance</div>; }
'@;
  'components/dashboard/analytics/export-panel.tsx' = @'
export function ExportPanel() { return <div className="rounded-xl border bg-card p-4">Export panel</div>; }
'@;
}

foreach ($key in $files.Keys) {
  $target = Join-Path $root $key
  $dir = Split-Path -Parent $target
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Set-Content -Path $target -Value $files[$key] -Encoding utf8
}

Write-Host "Created $($files.Count) compatibility shims."
