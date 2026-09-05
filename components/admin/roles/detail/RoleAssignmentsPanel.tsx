// components/admin/roles/detail/RoleAssignmentsPanel.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revokeRoleAction } from '@/server/actions/admin/role-audit/revoke-role';
import { blockAssignmentAction } from '@/server/actions/admin/role-audit/block-assignment';
import { unblockAssignmentAction } from '@/server/actions/admin/role-audit/unblock-assignment';
import { updatePermissionOverrideAction } from '@/server/actions/admin/role-audit/update-permission-override';

export type AssignmentItem = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  assignedAt: string;
  isBlocked: boolean;
  blockedReason: string | null;
  overrides: Array<{
    id: string;
    permissionCode: string;
    permissionName: string;
    isGranted: boolean;
    expiresAt: string | null;
  }>;
};

export function RoleAssignmentsPanel({ assignments }: { assignments: AssignmentItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.success ? (result.message ?? 'Opération effectuée.') : (result.error ?? 'Erreur'));
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Assignments ({assignments.length})</h2>
      {assignments.length === 0 && <p className="text-sm text-slate-500">Aucun utilisateur assigné à ce rôle.</p>}
      <div className="divide-y divide-slate-100">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-slate-900">{assignment.userName || assignment.userEmail}</p>
              <p className="text-sm text-slate-500">
                {assignment.userEmail} · assigné le {new Date(assignment.assignedAt).toLocaleDateString('fr-FR')}
                {assignment.isBlocked && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">bloqué{assignment.blockedReason ? ` — ${assignment.blockedReason}` : ''}</span>}
              </p>
              {assignment.overrides.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {assignment.overrides.map((override) => (
                    <span key={override.id} className={`rounded-full px-2 py-1 text-xs ${override.isGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {override.permissionCode} : {override.isGranted ? 'ON' : 'OFF'}
                      {override.expiresAt ? ` (expire le ${new Date(override.expiresAt).toLocaleDateString('fr-FR')})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {assignment.isBlocked ? (
                <button type="button" disabled={pending} onClick={() => run(() => unblockAssignmentAction(assignment.id))} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Débloquer</button>
              ) : (
                <button type="button" disabled={pending} onClick={() => run(() => blockAssignmentAction(assignment.id, 'Blocage manuel'))} className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Bloquer</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => revokeRoleAction(assignment.id))} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Révoquer</button>
            </div>
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}

export function PermissionOverrideToggle({
  assignmentId,
  permissionId,
  permissionCode,
  current,
}: {
  assignmentId: string;
  permissionId: string;
  permissionCode: string;
  current: boolean | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(isGranted: boolean) {
    startTransition(async () => {
      await updatePermissionOverrideAction({ assignmentId, permissionId, isGranted, expiresAt: null });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <code className="text-xs text-slate-600">{permissionCode}</code>
      <button type="button" disabled={pending} onClick={() => set(true)} className={`rounded px-2 py-1 text-xs font-semibold ${current === true ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-600'}`}>ON</button>
      <button type="button" disabled={pending} onClick={() => set(false)} className={`rounded px-2 py-1 text-xs font-semibold ${current === false ? 'bg-red-600 text-white' : 'border border-slate-300 text-slate-600'}`}>OFF</button>
      {current !== null && (
        <button type="button" disabled={pending} onClick={() => set(current)} className="text-xs text-slate-400 underline">supprimer</button>
      )}
    </div>
  );
}
