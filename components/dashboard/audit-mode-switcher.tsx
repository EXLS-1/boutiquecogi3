// components/dashboard/audit-mode-switcher.tsx
"use client";

import { useState } from "react";
import { useSwitchRBAC } from "@/components/providers/switch-provider";
import { ROLES, type Role } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Eye, EyeOff, Loader2, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

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
    requiresAuditApproval,
    auditState,
    requestApproval,
    startAudit,
    stopAudit,
  } = useSwitchRBAC();

  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const [reason, setReason] = useState("");
  const [approvalToken, setApprovalToken] = useState("");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);

  // Rôles auditable = niveau strictement supérieur
  const auditableRoles = ROLE_OPTIONS.filter((r) => r.level > realLevel);

  const handleRequestApproval = async () => {
    if (!selectedRole || !reason.trim()) return;
    await requestApproval(selectedRole, reason.trim());
    setShowRequestDialog(false);
  };

  const handleStartAuditWithToken = async () => {
    if (!selectedRole || !approvalToken.trim()) return;
    await startAudit(selectedRole, approvalToken.trim());
    setShowTokenDialog(false);
    setApprovalToken("");
  };

  const handleDirectStart = async () => {
    if (!selectedRole) return;
    await startAudit(selectedRole);
  };

  return (
    <div className="flex items-center gap-3">
      {isAuditMode ? (
        <>
          <Badge variant="destructive" className="gap-1 border-amber-600 bg-amber-100 text-amber-800">
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
            {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
            Quitter
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">{realRole}</span>
            <span className="text-[10px] text-slate-400">· Niv. {realLevel}</span>
          </div>

          {auditableRoles.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
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

              {requiresAuditApproval ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowRequestDialog(true)}
                    disabled={!selectedRole}
                    className="h-8 gap-1 text-xs"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Demander l'accès
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTokenDialog(true)}
                    disabled={!selectedRole}
                    className="h-8 gap-1 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    J'ai un token
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDirectStart}
                  disabled={!selectedRole || isTransitioning}
                  className="h-8 gap-1 text-xs"
                >
                  {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                  Auditer
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* État de la demande */}
      {auditState.status === "pending_approval" && (
        <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700">
          <Clock className="h-3 w-3 animate-pulse" />
          En attente d'approbation
        </Badge>
      )}
      {auditState.status === "rejected" && (
        <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-700">
          <AlertCircle className="h-3 w-3" />
          Refusé
        </Badge>
      )}

      {/* Dialog: Demande d'approbation */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demande d'approbation d'audit</DialogTitle>
            <DialogDescription>
              Un SUPER_ADMIN doit approuver votre demande pour auditer le rôle {selectedRole}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motif de l'audit</Label>
              <Input
                id="reason"
                placeholder="Ex: Test des permissions éditeur pour validation UI..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Annuler</Button>
            <Button onClick={handleRequestApproval} disabled={!reason.trim()}>
              Soumettre la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Saisie du token */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Token d'approbation</DialogTitle>
            <DialogDescription>
              Saisissez le token fourni par le SUPER_ADMIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="UUID du token..."
              value={approvalToken}
              onChange={(e) => setApprovalToken(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokenDialog(false)}>Annuler</Button>
            <Button onClick={handleStartAuditWithToken} disabled={!approvalToken.trim()}>
              Valider et auditer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}