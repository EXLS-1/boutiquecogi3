// components/dashboard/products/product-selection-wrapper.tsx
"use client";

import { useState } from "react";
import { ProductsTable } from "./products-table"; // Votre tableau existant adapté
import { BulkActions } from "./bulk-actions";  // Le composant d'UI pour les actions
import type { Permission } from "@/lib/auth/rbac";

interface ProductSelectionWrapperProps {
  products: any[];
  total: number;
  page: number;
  limit: number;
  canDelete: boolean;
  canManageVariants: boolean;
  canManageReviews: boolean;
  clientPermissions: Permission[];
  userLevel: number;
}

export function ProductSelectionWrapper({
  products,
  total,
  page,
  limit,
  canDelete,
  canManageVariants,
  canManageReviews,
  clientPermissions,
  userLevel,
}: ProductSelectionWrapperProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end min-h-[40px]">
        <BulkActions
          permissions={clientPermissions}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onActionComplete={() => setSelectedIds([])}
          totalCount={products.length}
          userLevel={userLevel}
        />
      </div>

      <ProductsTable
        products={products}
        total={total}
        page={page}
        limit={limit}
        canDelete={canDelete}
        canManageVariants={canManageVariants}
        canManageReviews={canManageReviews}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}