// components/providers/switch-provider.tsx

"use client";

import React, { createContext, useContext, useState, useMemo, useTransition, useCallback, useRef } from "react";
import { getClientPermissions, getClientRestrictions } from "@/lib/auth/rbac";
import { validateAuditToken } from "@/lib/auth/audit-approval";
import type { Role, Permission, Restriction, ToggleState } from "@/lib/auth/rbac";
import { ROLE_TO_LEVEL } from "@/lib/auth/rbac-shared";

const CLIENT_ROLE_LEVELS = ROLE_TO_LEVEL;

type AuditState =
  | { status: "idle" }
  | { status: "pending_approval"; requestId: string; message: string }
  | { status: "approved"; token: string; expiresAt: Date }
  | { status: "rejected"; reason: string };

type SwitchContextType = {
  // Identité réelle
  realRole: Role;
  realLevel: number;
  requiresAuditApproval: boolean;

  // Identité active
  activeRole: Role;
  activeLevel: number;
  isAuditMode: boolean;
  isTransitioning: boolean;

  // État de l'approbation
  auditState: AuditState;

  // Fonctions
  requestApproval: (targetRole: Role, reason: string) => Promise<void>;
  startAudit: (targetRole: Role, approvalToken?: string) => Promise<void>;
  stopAudit: () => void;

  // Droits
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
  requiresAuditApproval: boolean;
}

export function SwitchProvider({
  children,
  initialRole,
  initialLevel,
  initialPermissions,
  initialRestrictions,
  requiresAuditApproval,
}: SwitchProviderProps) {
  const [isPending, startTransition] = useTransition();

  const [realRole] = useState<Role>(initialRole);
  const [realLevel] = useState<number>(initialLevel);
  const [requiresApproval] = useState<boolean>(requiresAuditApproval);

  const [activeRole, setActiveRole] = useState<Role>(initialRole);
  const [activePermissions, setActivePermissions] = useState<Permission[]>(initialPermissions);
  const [activeRestrictions, setActiveRestrictions] = useState<Record<Restriction, string | ToggleState>>(initialRestrictions);
  const [auditState, setAuditState] = useState<AuditState>({ status: "idle" });

  // Timer pour auto-expiration du token
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAuditMode = activeRole !== realRole;
  const permissionSet = useMemo(() => new Set(activePermissions), [activePermissions]);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const requestApproval = useCallback(async (targetRole: Role, reason: string) => {
    const { requestAuditApproval } = await import("@/lib/auth/audit-approval");
    const result = await requestAuditApproval(targetRole, reason);

    if (!result.success) {
      setAuditState({ status: "rejected", reason: result.error });
      return;
    }

    if (result.requestId === "AUTO_APPROVED") {
      setAuditState({ status: "idle" });
      return;
    }

    setAuditState({
      status: "pending_approval",
      requestId: result.requestId,
      message: result.message
    });
  }, []);

  const stopAuditRef = useRef<() => void>(() => { });

  const startAudit = useCallback(async (targetRole: Role, approvalToken?: string) => {
    const targetLevel = CLIENT_ROLE_LEVELS[targetRole];

    // Vérifie la hiérarchie
    if (realLevel >= targetLevel) {
      console.error(`Violation: niveau ${realLevel} ne peut pas auditer ${targetLevel}`);
      return;
    }

    // Si approbation requise, valide le token
    if (requiresApproval) {
      if (!approvalToken) {
        setAuditState({ status: "rejected", reason: "Token d'approbation requis." });
        return;
      }

      const validation = await validateAuditToken(approvalToken);
      if (!validation.valid) {
        setAuditState({ status: "rejected", reason: validation.error });
        return;
      }

      // Programme l'auto-expiration
      clearExpiryTimer();
      const msUntilExpiry = validation.request.expiresAt.getTime() - Date.now();
      if (msUntilExpiry > 0) {
        expiryTimerRef.current = setTimeout(() => {
          stopAuditRef.current();
          setAuditState({ status: "idle" });
        }, msUntilExpiry);
      }

      setAuditState({
        status: "approved",
        token: approvalToken,
        expiresAt: validation.request.expiresAt
      });
    }

    startTransition(async () => {
      try {
        const [newPermissions, newRestrictions] = await Promise.all([
          getClientPermissions(targetRole),
          getClientRestrictions(targetRole),
        ]);

        setActiveRole(targetRole);
        setActivePermissions(newPermissions);
        setActiveRestrictions(newRestrictions);
      } catch (error) {
        console.error("Échec du chargement du contexte d'audit:", error);
        setAuditState({ status: "rejected", reason: "Erreur de chargement des permissions." });
      }
    });
  }, [realLevel, requiresApproval, clearExpiryTimer]);

  const initialPermissionsRef = useRef(initialPermissions);
  const initialRestrictionsRef = useRef(initialRestrictions);

  const stopAudit = useCallback(() => {
    clearExpiryTimer();
    startTransition(() => {
      setActiveRole(realRole);
      setActivePermissions(initialPermissionsRef.current);
      setActiveRestrictions(initialRestrictionsRef.current);
      setAuditState({ status: "idle" });
    });
  }, [realRole, clearExpiryTimer]);

  const contextValue = useMemo<SwitchContextType>(() => ({
    realRole,
    realLevel,
    requiresAuditApproval: requiresApproval,
    activeRole,
    activeLevel: CLIENT_ROLE_LEVELS[activeRole],
    isAuditMode,
    isTransitioning: isPending,
    auditState,
    requestApproval,
    startAudit,
    stopAudit,
    hasPermission: (p) => permissionSet.has(p),
    hasAnyPermission: (ps) => ps.some((p) => permissionSet.has(p)),
    getRestriction: (r) => activeRestrictions[r] ?? "OFF",
  }), [realRole, realLevel, requiresApproval, activeRole, isAuditMode, isPending, auditState, requestApproval, startAudit, stopAudit, permissionSet, activeRestrictions]);

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
