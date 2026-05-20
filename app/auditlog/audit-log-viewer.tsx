// app/auditlog/audit-log-viewer.tsx
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Définition du type pour une entrée de journal d'audit
interface AuditLogEntry {
  id: string;
  userId: string | null;
  user?: {
    name: string | null;
    email: string | null;
  };
  action: string;
  entity: string | null;
  entityType: string | null;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  metadata: any;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export function AuditLogViewer({ initialAuditLogs }: { initialAuditLogs: AuditLogEntry[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entité</TableHead>
            <TableHead>ID Entité</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Détails</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialAuditLogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                Aucun journal d'audit trouvé.
              </TableCell>
            </TableRow>
          ) : (
            initialAuditLogs.map((log) => (
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
                <TableCell className="text-slate-600">{log.entityType || log.entity || "N/A"}</TableCell>
                <TableCell className="font-mono text-xs text-slate-700">{log.entityId?.substring(0, 8) || "N/A"}</TableCell>
                <TableCell className="text-slate-500 text-xs">{log.ip || "N/A"}</TableCell>
                <TableCell className="text-slate-500 text-xs max-w-50 truncate">
                  {log.oldValue && log.newValue ? `Changement: ${JSON.stringify(log.oldValue)} -> ${JSON.stringify(log.newValue)}` : JSON.stringify(log.metadata || {})}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}