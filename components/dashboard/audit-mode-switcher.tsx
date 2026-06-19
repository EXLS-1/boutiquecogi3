// components/dashboard/audit-mode-switcher.tsx
"use client";

import { useState } from "react";
import { useSwitchRBAC } from "@/components/providers/switch-provider";
import { ROLES, type Role } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";

const ROLE_OPTIONS: { role: Role; label: string; level: number }[] = [
  { role: ROLES.SUPER_ADMIN, label: "Super-Admin", level: 1 },
  { role: ROLES.ADMIN, label: "Admin", level: 2 },
  { role: ROLES.MANAGER, label: "Manager", level: 3 },
  { role: ROLES.EDITOR, label: "Editor", level: 4 },
  { role: ROLES.SUPERVISOR, label: "Supervisor", level: 5 },
  { role: ROLES.USER, label: "User", level: 6 },
];

export function AuditModeSwitcher() {
  const {
    realRole,
    realLevel,
    activeRole,
    activeLevel,
    isAuditMode,
    isTransitioning,
    startAudit,
    stopAudit,
  } = useSwitchRBAC();

  const [selectedRole, setSelectedRole] = useState<Role | "">("");

  // Rôles auditable = niveau strictement supérieur (chiffre plus grand = moins de privilèges)
  const auditableRoles = ROLE_OPTIONS.filter(
    (r) => r.level > realLevel
  );

  const handleStartAudit = async () => {
    if (!selectedRole) return;
    await startAudit(selectedRole);
  };

  return (
    <div className="flex items-center gap-3">
      {isAuditMode ? (
        <>
          <Badge variant="destructive" className="gap-1 border-amber-600 bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Eye className="h-3 w-3" />
            Audit: {activeRole} (Niv. {activeLevel})
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={stopAudit}
            disabled={isTransitioning}
            className="h-8 gap-1 text-xs"
          >
            {isTransitioning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            Quitter l&apos;audit
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">
              {realRole}
            </span>
            <span className="text-[10px] text-slate-400">· Niveau {realLevel}</span>
          </div>

          {auditableRoles.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as Role)}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Simuler un rôle..." />
                </SelectTrigger>
                <SelectContent>
                  {auditableRoles.map((r) => (
                    <SelectItem key={r.role} value={r.role} className="text-xs">
                      {r.label} (Niv. {r.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleStartAudit}
                disabled={!selectedRole || isTransitioning}
                className="h-8 gap-1 text-xs"
              >
                {isTransitioning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                Auditer
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
