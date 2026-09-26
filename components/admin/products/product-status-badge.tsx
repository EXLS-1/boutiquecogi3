// components/admin/products/product-status-badge.tsx
// COMPONENT — Badge de statut produit

import { PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS } from "@/lib/product/constants";
import type { ProductStatus } from "@prisma/client";

interface ProductStatusBadgeProps {
  status: ProductStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ProductStatusBadge({ status, size = "md", showLabel = true }: ProductStatusBadgeProps) {
  const colorClass = PRODUCT_STATUS_COLORS[status] || "bg-gray-100 text-gray-700";
  const label = PRODUCT_STATUS_LABELS[status] || status;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 rounded",
    md: "text-sm px-2.5 py-1 rounded-full",
    lg: "text-base px-3 py-1.5 rounded-full",
  };

  return (
    <span className={`font-medium ${colorClass} ${sizeClasses[size]}`}>
      {showLabel ? label : status}
    </span>
  );
}
