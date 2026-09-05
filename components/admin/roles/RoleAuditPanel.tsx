'use client';

import { useState } from 'react';
import { assignRoleAction } from '@/server/actions/user-admin-actions';

type Role = { id: string; role: string; level: number };
type Assignment = {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  isBlocked: boolean;
  user: { id: string; name: string | null; email: string; status: string };
  permissionOverrides: Array<{ id: string; isGranted: boolean; expiresAt: Date | null; permission: { code: string; name: string } }>;
};
type AuditLog = { id: string; action: string; targetId: string | null; targetType: string | null; details: string | null; createdAt: Date; roleLevel: number; user: { name: string | null; email: string } | null };

export function RoleAuditPanel({ roles, assignments, auditLogs }: { roles: Role[]; assignments: Assignment[]; auditLogs: AuditLog[] }) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const visibleAssignments = assignments.filter((assignment) => assignment.roleId === roleId);

  async function assign(userId: string) {
    setPending(userId);
    const result = await assignRoleAction(userId, roleId);
    setMessage(result.success ? 'Rôle assigné et événement enregistré.' : result.error);
    setPending(null);
  }

  return <div className="space-y-6">
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">Assignments</h2><p className="text-sm text-slate-600">Les changements passent par la policy d’assignation.</p></div><label className="text-sm font-medium text-slate-700">Rôle<select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="ml-2 rounded-md border border-slate-300 px-3 py-2">{roles.map((role) => <option key={role.id} value={role.id}>{role.role} · niveau {role.level}</option>)}</select></label></div>
      <div className="divide-y divide-slate-100">{visibleAssignments.length === 0 ? <p className="py-6 text-sm text-slate-500">Aucun utilisateur assigné à ce rôle.</p> : visibleAssignments.map((assignment) => <div key={assignment.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-medium text-slate-900">{assignment.user.name || assignment.user.email}</p><p className="text-sm text-slate-500">{assignment.user.email} · assigné le {new Date(assignment.assignedAt).toLocaleDateString('fr-FR')}</p><div className="mt-2 flex flex-wrap gap-2">{assignment.permissionOverrides.map((override) => <span key={override.id} className={`rounded-full px-2 py-1 text-xs ${override.isGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{override.permission.code}: {override.isGranted ? 'ON' : 'OFF'}</span>)}</div></div><button type="button" disabled={pending === assignment.userId} onClick={() => assign(assignment.userId)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{pending === assignment.userId ? 'Enregistrement…' : 'Réassigner'}</button></div>)}</div>
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold text-slate-950">Audit des rôles</h2><div className="divide-y divide-slate-100">{auditLogs.map((log) => <article key={log.id} className="py-3"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-slate-900">{log.action}</strong><time className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</time></div><p className="mt-1 text-sm text-slate-600">{log.user?.name || log.user?.email || 'Système'} · cible {log.targetType || 'N/A'} {log.targetId || ''}</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-500">{log.details || 'Aucun détail'}</pre></article>)}</div></section>
  </div>;
}