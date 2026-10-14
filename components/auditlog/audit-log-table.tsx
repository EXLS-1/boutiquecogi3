// components/auditlog/audit-log-table.tsx
// ============================================
// TABLE DES LOGS D'AUDIT
// ============================================
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { AUDIT_SEVERITY } from "@/lib/audit/types";

interface AuditLogEntry {
  id: string;
  userId: string | null;
  user: {
    name: string | null;
    email: string;
  } | null;
  action: string;
  entity: string | null;
  entityType: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  severity: string;
  status: string | null;
  error: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  duration: number | null;
  createdAt: Date;
}

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails?: (log: AuditLogEntry) => void;
}

function getSeverityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case AUDIT_SEVERITY.CRITICAL:
      return "destructive";
    case AUDIT_SEVERITY.ERROR:
      return "destructive";
    case AUDIT_SEVERITY.WARNING:
      return "secondary";
    default:
      return "outline";
  }
}

export function AuditLogTable({ logs, page, totalPages, onPageChange, onViewDetails }: AuditLogTableProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Aucun journal d'audit trouvé.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-slate-500 text-sm">
                    {format(log.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {log.user?.name || log.user?.email || log.userId || "Système"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {log.entityType || log.entity || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(log.severity)}>
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {log.ipAddress || "N/A"}
                  </TableCell>
                  <TableCell>
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page {page} sur {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
