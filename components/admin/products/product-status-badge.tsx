// components/admin/products/product-status-badge.tsx
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS } from "@/lib/products/product.constants";

export function ProductStatusBadge({ status }: { status: string }) {
  const label = PRODUCT_STATUS_LABELS[status] ?? status;
  const color = PRODUCT_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}
