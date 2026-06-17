// /app/(dashboard)/products/page.tsx
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ProductManager } from "./ProductManager";
import { getCurrentUserRole, getClientPermissions, PERMISSIONS } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const role = await getCurrentUserRole();
  const permissions = await getClientPermissions(role);

  // Récupération initiale des produits côté serveur pour un chargement instantané (SSR / ISR)
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      isActive: true,
      // ... ajoutez vos champs requis
    }
  });

  return (
    <PermissionGate
      permissions={[
        PERMISSIONS.PRODUCTS_UPDATE,
        PERMISSIONS.PRODUCTS_DELETE,
        PERMISSIONS.PRODUCTS_BULK_EDIT,
        PERMISSIONS.PRODUCTS_EXPORT,
      ]}
      requireAll={false}
    >
      <ProductManager 
        permissions={permissions} 
        initialProducts={products} 
      />
    </PermissionGate>
  );
}