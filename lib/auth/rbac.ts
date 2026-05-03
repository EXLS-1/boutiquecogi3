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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// mapping rôle → permissions
export const rolePermissions: Record<Role, Permission[]> = {
  user: [PERMISSIONS.READ_PROFILE],
  admin: [
    PERMISSIONS.READ_PROFILE,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.ADMIN_DASHBOARD,
  ],
  super_admin: Object.values(PERMISSIONS),
};