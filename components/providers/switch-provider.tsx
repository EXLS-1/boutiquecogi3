// components/providers/switch-provider.tsx
"use client";

import React, { createContext, useContext, useState, useMemo, useTransition } from "react";
import { getClientPermissions, getClientRestrictions } from "@/lib/auth/rbac";
import type { Role, Permission, Restriction, ToggleState } from "@/lib/auth/rbac";

// Duplication immuable de la hiérarchie pour contrôle synchrone en O(1) côté client
const CLIENT_ROLE_LEVELS: Record<Role, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  EDITOR: 4,
  SUPERVISOR: 5,
  USER: 6,
};

type SwitchContextType = {
  // Identité réelle (jamais modifiée)
  realRole: Role;
  realLevel: number;

  // Données de l'identité active (Réelle ou Simulée)
  activeRole: Role;
  activeLevel: number;
  isAuditMode: boolean;
  isTransitioning: boolean;
  
  // Fonctions de contrôle d'audit
  startAudit: (targetRole: Role) => Promise<void>;
  stopAudit: () => void;

  // Évaluation synchrone des droits
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  getRestriction: (restriction: Restriction) => string | ToggleState;
};

const SwitchContext = createContext<SwitchContextType | null>(null);

interface SwitchProviderProps {
  children: React.ReactNode;
  initialRole: Role;
  initialLevel: number;
  initialPermissions: Permission[];
  initialRestrictions: Record<Restriction, string | ToggleState>;
}

export function SwitchProvider({
  children,
  initialRole,
  initialLevel,
  initialPermissions,
  initialRestrictions,
}: SwitchProviderProps) {
  const [isPending, startTransition] = useTransition();
  
  // Identité réelle figée pour les vérifications de sécurité
  const [realRole] = useState<Role>(initialRole);
  const [realLevel] = useState<number>(initialLevel);

  // États de l'identité en cours d'utilisation
  const [activeRole, setActiveRole] = useState<Role>(initialRole);
  const [activePermissions, setActivePermissions] = useState<Permission[]>(initialPermissions);
  const [activeRestrictions, setActiveRestrictions] = useState<Record<Restriction, string | ToggleState>>(initialRestrictions);

  const isAuditMode = activeRole !== realRole;

  // Cache d'accès rapide pour les permissions
  const permissionSet = useMemo(() => new Set(activePermissions), [activePermissions]);

  const startAudit = async (targetRole: Role) => {
    const targetLevel = CLIENT_ROLE_LEVELS[targetRole];

    // RÈGLE CRITIQUE : Interdiction absolue de basculer vers un niveau supérieur ou égal
    // Rappel : Level 1 (SUPER_ADMIN) < Level 2 (ADMIN). Plus le chiffre est petit, plus le pouvoir est grand.
    if (realLevel >= targetLevel) {
      console.error(`Violation de sécurité : Un niveau ${realLevel} ne peut pas auditer un niveau ${targetLevel}.`);
      alert("Action refusée : Droits hiérarchiques insuffisants pour simuler ce rôle.");
      return;
    }

    // Exécution dans une transition React pour éviter de bloquer l'UI globale
    startTransition(async () => {
      try {
        // Résolution parallèle des droits du rôle cible via tes Server Actions
        const [newPermissions, newRestrictions] = await Promise.all([
          getClientPermissions(targetRole),
          getClientRestrictions(targetRole),
        ]);

        setActiveRole(targetRole);
        setActivePermissions(newPermissions);
        setActiveRestrictions(newRestrictions);
      } catch (error) {
        console.error("Échec du chargement du contexte d'audit applicatif:", error);
      }
    });
  };

  const stopAudit = () => {
    startTransition(() => {
      setActiveRole(realRole);
      setActivePermissions(initialPermissions);
      setActiveRestrictions(initialRestrictions);
    });
  };

  const contextValue = useMemo<SwitchContextType>(() => ({
    realRole,
    realLevel,
    activeRole,
    activeLevel: CLIENT_ROLE_LEVELS[activeRole],
    isAuditMode,
    isTransitioning: isPending,
    startAudit,
    stopAudit,
    hasPermission: (p) => permissionSet.has(p),
    hasAnyPermission: (ps) => ps.some((p) => permissionSet.has(p)),
    getRestriction: (r) => activeRestrictions[r] ?? "OFF",
  }), [realRole, realLevel, activeRole, isAuditMode, isPending, permissionSet, activeRestrictions]);

  return (
    <SwitchContext.Provider value={contextValue}>
      {children}
    </SwitchContext.Provider>
  );
}

export function useSwitchRBAC() {
  const context = useContext(SwitchContext);
  if (!context) {
    throw new Error("useSwitchRBAC doit être encapsulé au sein d'un SwitchProvider.");
  }
  return context;
}