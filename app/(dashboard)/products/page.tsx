// /app/(dashboard)/products/page.tsx
// ============================================
// Server Component — Passe les permissions au client
// ============================================

import { PermissionGate } from "@/components/auth/PermissionGate";
import { BulkActions } from "./BulkActions";
import { ProductTable } from "./ProductTable";
import {
  getCurrentUserRole,
  getClientPermissions,
  PERMISSIONS,
} from "@/lib/auth/rbac";

export default async function ProductsPage() {
  const role = await getCurrentUserRole();
  const permissions = await getClientPermissions(role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produits</h1>
      </div>

      {/* BulkActions reçoit les permissions du serveur */}
      <PermissionGate
        permissions={[
          PERMISSIONS.PRODUCTS_UPDATE,
          PERMISSIONS.PRODUCTS_DELETE,
          PERMISSIONS.PRODUCTS_BULK_EDIT,
          PERMISSIONS.PRODUCTS_EXPORT,
        ]}
        requireAll={false}
      >
        <BulkActions
          permissions={permissions}
          selectedIds={[]} // Géré par le ProductTable côté client
          totalCount={150}
        />
      </PermissionGate>

      <ProductTable />
    </div>
  );
}