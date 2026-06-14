// /lib/auth/rbac.ts

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  READ_PROFILE: "read:profile",
  EDIT_PROFILE: "edit:profile",
  ADMIN_DASHBOARD: "admin:dashboard",
  CHECKOUT: "checkout",
  CART: "cart",
  ACCESS_CART: "access:cart",
  WISHLIST: "wishlist",
  CREATE_ADMIN: "create:admin",
  BLOCK_USER: "block:user",
  BLOCK_ADMIN: "block:admin",
  BLOCK_SUPER_ADMIN: "block:super_admin",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const rolePermissions: Record<Role, Permission[]> = {
  user: [
    PERMISSIONS.READ_PROFILE,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.ACCESS_CART,
    PERMISSIONS.CHECKOUT,
    PERMISSIONS.CART,
    PERMISSIONS.WISHLIST,
  ],
  admin: [
    PERMISSIONS.READ_PROFILE,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ACCESS_CART,
    PERMISSIONS.CHECKOUT,
    PERMISSIONS.CART,
    PERMISSIONS.WISHLIST,
    PERMISSIONS.BLOCK_USER,
    // admin peut bloquer un user
    // pas de BLOCK_ADMIN, pas de BLOCK_SUPER_ADMIN, pas de CREATE_ADMIN
  ],
  super_admin: Object.values(PERMISSIONS),
};

export function hasPermission(
  userRole: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!userRole) return false;

  const isValidRole = Object.values(ROLES).includes(userRole);
  if (!isValidRole) return false;

  const permissions = rolePermissions[userRole] ?? [];
  return permissions.includes(permission);
}

// Helpers spécifiques

export function canCreateAdmin(userRole: Role | null | undefined): boolean {
  return hasPermission(userRole, PERMISSIONS.CREATE_ADMIN);
}

export function canBlockUser(userRole: Role | null | undefined): boolean {
  return hasPermission(userRole, PERMISSIONS.BLOCK_USER);
}

export function canBlockAdmin(userRole: Role | null | undefined): boolean {
  return hasPermission(userRole, PERMISSIONS.BLOCK_ADMIN);
}

export function canBlockSuperAdmin(userRole: Role | null | undefined): boolean {
  return hasPermission(userRole, PERMISSIONS.BLOCK_SUPER_ADMIN);
}
