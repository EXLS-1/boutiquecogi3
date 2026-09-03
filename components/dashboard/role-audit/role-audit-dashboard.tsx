'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_ROLE_CONFIG,
  PERMISSIONS,
  RESTRICTIONS,
  type Role,
  type Permission,
} from '@/lib/auth/rbac-shared';
import { assignRoleAction } from '@/server/actions/user-admin-actions';

interface RoleAuditDashboardProps {
  currentUserLevel: number;
  currentUserRole: string;
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    role: Role;
    roleLevel: number;
    isBlocked: boolean;
  }>;
  roles: Array<{
    id: string;
    role: Role;
    level: number;
    name: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetId: string | null;
    details: string | null;
    createdAt: Date;
  }>;
}

const roleHighlights: Record<Role, { permissions: Permission[]; restrictions: string[] }> = {
  SUPER_ADMIN: {
    permissions: [
      PERMISSIONS['role:assign'],
      PERMISSIONS['users:impersonate'],
      PERMISSIONS['system:config'],
      PERMISSIONS['system:backup'],
      PERMISSIONS['system:maintenance'],
    ],
    restrictions: [
      RESTRICTIONS.REQUIRES_AUDIT_APPROVAL,
      RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE,
    ],
  },
  ADMIN: {
    permissions: [
      PERMISSIONS['users:read'],
      PERMISSIONS['users:update'],
      PERMISSIONS['role:assign'],
      PERMISSIONS['audit:view-logs'],
      PERMISSIONS['audit:switch-self'],
    ],
    restrictions: [
      RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES,
      RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS,
      RESTRICTIONS.REQUIRES_AUDIT_APPROVAL,
    ],
  },
  MANAGER: {
    permissions: [
      PERMISSIONS['products:create'],
      PERMISSIONS['products:update'],
      PERMISSIONS['orders:refund'],
      PERMISSIONS['analytics:export'],
      PERMISSIONS['media:upload'],
    ],
    restrictions: [
      RESTRICTIONS.MAX_DAILY_ORDERS,
      RESTRICTIONS.MAX_STORAGE_MB,
      RESTRICTIONS.CAN_ACCESS_API,
      RESTRICTIONS.CAN_EXPORT_DATA,
    ],
  },
  EDITOR: {
    permissions: [
      PERMISSIONS['products:update'],
      PERMISSIONS['content:create'],
      PERMISSIONS['content:publish'],
      PERMISSIONS['media:upload'],
      PERMISSIONS['analytics:read'],
    ],
    restrictions: [
      RESTRICTIONS.RESTRICTED_TO_OWN_DATA,
      RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES,
      RESTRICTIONS.MAX_PRODUCTS_PER_USER,
    ],
  },
  SUPERVISOR: {
    permissions: [
      PERMISSIONS['orders:read'],
      PERMISSIONS['orders:update'],
      PERMISSIONS['content:moderate'],
      PERMISSIONS['reports:generate'],
      PERMISSIONS['media:read'],
    ],
    restrictions: [
      RESTRICTIONS.RESTRICTED_TO_DEPARTMENT,
      RESTRICTIONS.RESTRICTED_TO_OWN_DATA,
      RESTRICTIONS.CAN_EXPORT_DATA,
    ],
  },
  USER: {
    permissions: [
      PERMISSIONS['orders:create'],
      PERMISSIONS['orders:read'],
      PERMISSIONS['products:read'],
      PERMISSIONS['categories:read'],
      PERMISSIONS['content:read'],
    ],
    restrictions: [
      RESTRICTIONS.MAX_DAILY_ORDERS,
      RESTRICTIONS.RATE_LIMIT_PER_MINUTE,
      RESTRICTIONS.SESSION_DURATION_HOURS,
    ],
  },
  GUEST: {
    permissions: [
      PERMISSIONS['products:read'],
      PERMISSIONS['categories:read'],
      PERMISSIONS['content:read'],
      PERMISSIONS['media:read'],
    ],
    restrictions: [
      RESTRICTIONS.CAN_ACCESS_API,
      RESTRICTIONS.MAX_DAILY_ORDERS,
      RESTRICTIONS.MAX_STORAGE_MB,
    ],
  },
};

function labelForPermission(permission: Permission) {
  return permission.split(':').join(' / ');
}

function prettyRestrictionName(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function RoleAuditDashboard({
  currentUserLevel,
  currentUserRole,
  users,
  roles,
  auditLogs,
}: RoleAuditDashboardProps) {
  const roleEntries = useMemo(
    () =>
      Object.entries(DEFAULT_ROLE_CONFIG).sort(
        ([, a], [, b]) => Number(a.level) - Number(b.level),
      ) as Array<[Role, (typeof DEFAULT_ROLE_CONFIG)[Role]]>,
    [],
  );

  const [assignments, setAssignments] = useState<Record<string, Role>>(() =>
    Object.fromEntries(users.map((user) => [user.id, user.role])),
  );
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const visibleRoles = roleEntries.filter(
    ([, config]) => config.level >= currentUserLevel,
  );

  const summary = roleEntries.reduce(
    (acc, [roleKey, config]) => {
      const enabled = Object.values(config.permissions).filter((value) => value === 'ON').length;
      acc.totalPermissions += enabled;
      acc.roles.push({ roleKey, level: config.level, enabled });
      return acc;
    },
    { totalPermissions: 0, roles: [] as Array<{ roleKey: Role; level: number; enabled: number }> },
  );

  const handleRoleChange = (userId: string, nextRole: Role) => {
    setAssignments((prev) => ({ ...prev, [userId]: nextRole }));
    setSaveMessage(null);
  };

  const handleSave = async (userId: string) => {
    const role = roles.find((entry) => entry.role === assignments[userId]);
    if (!role) return;

    setSavingUserId(userId);
    setSaveMessage(null);
    const result = await assignRoleAction(userId, role.id);
    setSaveMessage(result.success ? 'Rôle enregistré et ajouté à l’audit.' : result.error);
    setSavingUserId(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">RBAC</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Roles: attributs & audit</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Contrôle des changements de droits, des niveaux hiérarchiques et des restrictions de sécurité.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Session: <span className="font-semibold">{currentUserRole}</span> · Niveau {currentUserLevel}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Rôles</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{roleEntries.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Permissions actives</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{summary.totalPermissions}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Niveau max</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{Math.max(...roleEntries.map(([, config]) => config.level))}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Attribution rapide</h2>
          <span className="text-sm text-slate-500">Sécurité / hébergement</span>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.5fr_1.5fr_1fr] md:items-center"
            >
              <div>
                <div className="font-medium text-slate-900">{user.name}</div>
                <div className="text-sm text-slate-500">{user.email}</div>
              </div>

              <label className="text-sm text-slate-600">
                <span className="mb-2 block">Rôle assigné</span>
                <select
                  value={assignments[user.id]}
                  onChange={(event) => handleRoleChange(user.id, event.target.value as Role)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
                >
                  {visibleRoles.map(([roleKey]) => (
                    <option key={roleKey} value={roleKey}>
                      {roleKey} · Niveau {DEFAULT_ROLE_CONFIG[roleKey].level}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Aperçu</div>
                  <div className="mt-1 font-medium">{assignments[user.id]}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave(user.id)}
                  disabled={savingUserId === user.id || assignments[user.id] === user.role}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingUserId === user.id ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {users.length === 0 && <p className="text-sm text-slate-500">Aucun utilisateur à administrer.</p>}
        {saveMessage && <p className="mt-4 text-sm font-medium text-slate-700">{saveMessage}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Activité récente</h2>
          <span className="text-sm text-slate-500">Rôles et comptes</span>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun événement récent.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{log.action.replaceAll('_', ' ')}</span>
                  <span className="ml-2 text-slate-500">{log.targetId ? `cible ${log.targetId.slice(0, 8)}` : 'système'}</span>
                </div>
                <time className="text-xs text-slate-500" dateTime={log.createdAt.toISOString()}>
                  {log.createdAt.toLocaleString('fr-FR')}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Matrice RBAC</h2>
          <span className="text-sm text-slate-500">Niveau 1 = plus haut</span>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {roleEntries.map(([roleKey, config]) => {
            const highlight = roleHighlights[roleKey];
            const enabledPermissions = Object.entries(config.permissions).filter(([, state]) => state === 'ON');

            return (
              <article key={roleKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Niveau {config.level}</div>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{roleKey}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {enabledPermissions.length} permissions
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Permissions clés
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {highlight.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                        >
                          {labelForPermission(permission)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Restrictions clés
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {highlight.restrictions.map((restriction) => (
                        <span
                          key={restriction}
                          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700"
                        >
                          {prettyRestrictionName(restriction)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Contrôles sensibles
                    </div>
                    <div className="space-y-1 text-sm text-slate-700">
                      {Object.entries(config.restrictions)
                        .filter(([key, value]) =>
                          key === RESTRICTIONS.REQUIRES_AUDIT_APPROVAL ||
                          key === RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES ||
                          key === RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS ||
                          key === RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE ||
                          key === RESTRICTIONS.RESTRICTED_TO_OWN_DATA ||
                          key === RESTRICTIONS.CAN_ACCESS_API,
                        )
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between gap-3 rounded-md bg-white px-2.5 py-1.5">
                            <span>{prettyRestrictionName(key)}</span>
                            <span className="font-medium text-slate-900">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
