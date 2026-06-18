"use client";

import { useSwitchRBAC } from "@/components/providers/switch-provider";

export function AuditToolbar() {
  const { isAuditMode, startAudit, stopAudit, isTransitioning, activeRole } = useSwitchRBAC();

  return (
    <div className="p-4 bg-amber-50 border-b border-amber-200 flex gap-4 items-center">
      <p className="text-sm font-medium text-amber-800">
        Mode actif : <strong>{activeRole}</strong> {isAuditMode && "(Simulation)"}
      </p>
      
      {isAuditMode ? (
        <button onClick={stopAudit} disabled={isTransitioning} className="px-2 py-1 bg-amber-600 text-white text-xs rounded">
          Quitter l'audit
        </button>
      ) : (
        <div className="flex gap-2">
          {/* Un SUPER_ADMIN (Level 1) peut cliquer ici, un MANAGER (Level 3) verra l'action rejetée par le garde-fou */}
          <button onClick={() => startAudit("EDITOR")} disabled={isTransitioning} className="px-2 py-1 bg-slate-800 text-white text-xs rounded">
            Auditer le rôle ÉDITEUR
          </button>
          <button onClick={() => startAudit("USER")} disabled={isTransitioning} className="px-2 py-1 bg-slate-800 text-white text-xs rounded">
            Auditer le rôle USER
          </button>
        </div>
      )}
    </div>
  );
}