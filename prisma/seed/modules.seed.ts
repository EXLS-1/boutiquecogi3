import { PrismaClient } from "@prisma/client";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

const SHIPPING_UUID = "00000000-0000-4000-8000-000000000001";

export async function seedModules(prisma: PrismaClient) {
  console.log("📦 [RBAC] Configuration des modules système...");

  const shipping = await prisma.shippingMethod.upsert({
    where: { id: SHIPPING_UUID },
    update: {
      isActive: true,
      price: 500,
      metadata: {
        requiredPermission: PERMISSIONS.SETTINGS_UPDATE,
        minRoleLevel: 3,
        managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
      },
    },
    create: {
      id: SHIPPING_UUID,
      name: "Livraison standard Kinshasa",
      description: "Livraison sécurisée en 2 à 5 jours ouvrés",
      price: 500,
      isActive: true,
      metadata: {
        requiredPermission: PERMISSIONS.SETTINGS_UPDATE,
        minRoleLevel: 3,
        managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
      },
    },
  });

  console.log(`   ✓ ShippingMethod: ${shipping.name} (minLevel: 3)`);

  return { shipping };
}