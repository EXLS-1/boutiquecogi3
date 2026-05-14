// /lib/auth/rbac.ts

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// On transforme tes fonctions 'canAccess...' en permissions strictes
export const PERMISSIONS = {
  READ_PROFILE: "read:profile",
  EDIT_PROFILE: "edit:profile",
  ADMIN_DASHBOARD: "admin:dashboard",
  CHECKOUT: "checkout",
  CART: "cart",
  ACCESS_CART: "access:cart",
  WISHLIST: "wishlist",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Mapping immuable rôle → permissions
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
  ],
  super_admin: Object.values(PERMISSIONS),
};

/**
 * Fonction PURE pour vérifier une permission.
 * Gère le cas où l'utilisateur n'est pas connecté (guest/null).
 */
export function hasPermission(userRole: string | undefined | null, permission: Permission): boolean {
  if (!userRole) return false;
  
  const isValidRole = Object.values(ROLES).includes(userRole as Role);
  if (!isValidRole) return false;

  const permissions = rolePermissions[userRole as Role] ?? [];
  return permissions.includes(permission);
}
