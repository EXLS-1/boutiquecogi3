// components/dashboard/products/product-selection-wrapper.tsx
"use client";

import { useState, useCallback } from "react";
import { ProductsTable } from "./products-table";
import { BulkActions } from "./bulk-actions";
import type { Permission } from "@/lib/auth/rbac-shared";
import type { Prisma } from "@prisma/client";

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true } };
    variants: { select: { id: true } };
    _count: { select: { reviews: true; orderItems: true } };
  };
}>;

interface ProductSelectionWrapperProps {
  products: ProductWithRelations[];
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

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleActionComplete = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end min-h-[40px]">
        <BulkActions
          permissions={clientPermissions}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          onActionComplete={handleActionComplete}
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
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}
