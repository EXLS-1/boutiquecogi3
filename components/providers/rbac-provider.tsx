"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Role, Permission, Restriction, ToggleState } from "@/lib/auth/rbac";

type RBACContextType = {
  user: { id: string; email: string; name?: string | null; image?: string | null };
  role: Role;
  level: number;
  permissions: Permission[];
  restrictions: Record<Restriction, string | ToggleState>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  getRestriction: (restriction: Restriction) => string | ToggleState;
  isRestrictionEnabled: (restriction: Restriction) => boolean;
};

const RBACContext = createContext<RBACContextType | null>(null);

export function RBACProvider({
  children,
  user,
  role,
  level,
  permissions,
  restrictions,
}: {
  children: React.ReactNode;
  user: { id: string; email: string; name?: string | null; image?: string | null };
  role: Role;
  level: number;
  permissions: Permission[];
  restrictions: Record<Restriction, string | ToggleState>;
}) {
  // Mémoïsation du contexte pour éviter les re-renders inutiles des consommateurs
  const contextValue = useMemo<RBACContextType>(() => {
    // Utilisation d'un Set interne pour des lookups de permissions en O(1)
    const permissionSet = new Set(permissions);

    return {
      user,
      role,
      level,
      permissions,
      restrictions,
      hasPermission: (p) => permissionSet.has(p),
      hasAnyPermission: (ps) => ps.some((p) => permissionSet.has(p)),
      hasAllPermissions: (ps) => ps.every((p) => permissionSet.has(p)),
      getRestriction: (r) => restrictions[r] ?? "OFF",
      isRestrictionEnabled: (r) => restrictions[r] === "ON",
    };
  }, [user, role, level, permissions, restrictions]);

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

// Hook de consommation sécurisé
export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error("useRBAC doit être impérativement encapsulé dans un RBACProvider.");
  }
  return context;
}