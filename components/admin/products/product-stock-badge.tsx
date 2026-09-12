// components/admin/products/product-stock-badge.tsx
import { STOCK_THRESHOLDS } from "@/lib/products/product.constants";

export function ProductStockBadge({ available }: { available: number }) {
  const { LOW_STOCK, CRITICAL } = STOCK_THRESHOLDS;
  let color = "bg-green-100 text-green-800";
  let label = `${available} en stock`;
  if (available <= 0) { color = "bg-red-100 text-red-800"; label = "Rupture"; }
  else if (available <= CRITICAL) { color = "bg-red-100 text-red-800"; label = `${available} restant`; }
  else if (available <= LOW_STOCK) { color = "bg-amber-100 text-amber-800"; label = `${available} restant`; }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}
