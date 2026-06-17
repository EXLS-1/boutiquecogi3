// /app/(dashboard)/products/ProductManager.tsx
"use client";

import { useState } from "react";
import { BulkActions } from "./bulk-actions";
import { ProductTable } from "./ProductTable"; // Modifié pour accepter les props de sélection
import type { Permission } from "@/lib/auth/rbac";

interface ProductManagerProps {
  permissions: Permission[];
  initialProducts: any[]; // Remplacer par votre type Product réel
}

export function ProductManager({ permissions, initialProducts }: ProductManagerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleActionComplete = () => {
    setSelectedIds([]); // Reset de la sélection après réussite
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produits</h1>
        
        <BulkActions
          permissions={permissions}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          onActionComplete={handleActionComplete}
          totalCount={initialProducts.length}
        />
      </div>

      <ProductTable 
        products={initialProducts} 
        selectedIds={selectedIds} 
        onSelectionChange={handleSelectionChange} 
      />
    </div>
  );
}