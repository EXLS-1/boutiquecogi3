// components/auditlog/audit-log-details.tsx
// ============================================
// MODAL DE DÉTAILS D'UN LOG
// ============================================
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AuditLogDetailsProps {
  log: {
    id: string;
    userId: string | null;
    user: { name: string | null; email: string } | null;
    action: string;
    entity: string | null;
    entityType: string | null;
    entityId: string | null;
    oldValue: unknown;
    newValue: unknown;
    metadata: unknown;
    severity: string;
    status: string | null;
    error: unknown;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    browser: string | null;
    os: string | null;
    device: string | null;
    duration: number | null;
    createdAt: Date;
  };
  onClose: () => void;
}

export function AuditLogDetails({ log, onClose }: AuditLogDetailsProps) {
  const errorText =
    typeof log.error === "string"
      ? log.error
      : log.error == null
        ? null
        : JSON.stringify(log.error);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails du Log d'Audit
            <Badge variant="outline">{log.severity}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Date</label>
              <p className="text-slate-900">
                {format(log.createdAt, "dd/MM/yyyy HH:mm:ss", { locale: fr })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Utilisateur</label>
              <p className="text-slate-900">
                {log.user?.name || log.user?.email || log.userId || "Système"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Action</label>
              <p className="text-slate-900">{log.action}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Entité</label>
              <p className="text-slate-900">
                {log.entityType || log.entity || "N/A"}
                {log.entityId && ` (${log.entityId})`}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Statut</label>
              <p className="text-slate-900">{log.status || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Durée</label>
              <p className="text-slate-900">{log.duration ? `${log.duration}ms` : "N/A"}</p>
            </div>
          </div>

          {/* Détails techniques */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Informations Techniques</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">IP:</span>{" "}
                <span className="font-mono">{log.ipAddress || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-600">Navigateur:</span>{" "}
                <span>{log.browser || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-600">OS:</span>{" "}
                <span>{log.os || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-600">Appareil:</span>{" "}
                <span>{log.device || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Erreur */}
          {errorText != null && errorText !== "" && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">Erreur</h3>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{errorText}</p>
            </div>
          )}

          {/* Détails */}
          {log.details && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Détails</h3>
              <p className="text-sm text-slate-700">{log.details}</p>
            </div>
          )}

          {/* Changements */}
          {(log.oldValue || log.newValue) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Changements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Ancienne valeur</label>
                  <pre className="mt-1 p-3 bg-slate-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.oldValue, null, 2)}
                  </pre>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Nouvelle valeur</label>
                  <pre className="mt-1 p-3 bg-slate-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.newValue, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Métadonnées */}
          {log.metadata && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Métadonnées</h3>
              <pre className="p-3 bg-slate-50 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
