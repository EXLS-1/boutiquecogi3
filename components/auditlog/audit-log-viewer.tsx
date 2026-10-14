// components/auditlog/audit-log-viewer.tsx
// ============================================
// VIEWER COMPLET DES LOGS D'AUDIT
// ============================================
"use client";

import { useState } from "react";
import { AuditLogFilters } from "./audit-log-filters";
import { AuditLogTable } from "./audit-log-table";
import { AuditLogDetails } from "./audit-log-details";
import { getAuditLogs } from "@/lib/audit/audit.service";
import type { AuditLogFilter } from "@/lib/audit/types";

interface AuditLogViewerProps {
  initialLogs: Awaited<ReturnType<typeof getAuditLogs>>;
}

export function AuditLogViewer({ initialLogs }: AuditLogViewerProps) {
  const [logs, setLogs] = useState(initialLogs.logs);
  const [page, setPage] = useState(initialLogs.page);
  const [totalPages, setTotalPages] = useState(initialLogs.totalPages);
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [selectedLog, setSelectedLog] = useState<typeof logs[0] | null>(null);

  const handleFilterChange = async (newFilter: AuditLogFilter) => {
    setFilter(newFilter);
    const result = await getAuditLogs({ filter: newFilter, page: 1 });
    setLogs(result.logs);
    setPage(result.page);
    setTotalPages(result.totalPages);
  };

  const handlePageChange = async (newPage: number) => {
    const result = await getAuditLogs({ filter, page: newPage });
    setLogs(result.logs);
    setPage(result.page);
    setTotalPages(result.totalPages);
  };

  return (
    <div className="space-y-6">
      <AuditLogFilters onFilterChange={handleFilterChange} initialFilter={filter} />
      <AuditLogTable
        logs={logs}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onViewDetails={setSelectedLog}
      />
      {selectedLog && (
        <AuditLogDetails log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
