// components/admin/users/users-table.tsx
import type { AdminUserListItem } from '@/lib/admin/users';

// --- Utilitaires de formatage (Déplaçables dans lib/utils.ts) ---
const formatDate = (d: Date | null | undefined) =>
  d
    ? new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(d))
    : '-';

const formatRole = (role: string | null | undefined) => {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700 ring-red-600/20',
    ADMIN: 'bg-orange-100 text-orange-700 ring-orange-600/20',
    MANAGER: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    EDITOR: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    SUPERVISOR: 'bg-purple-100 text-purple-700 ring-purple-600/20',
    USER: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    GUEST: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  };
  const roleStr = (role ?? 'USER').toUpperCase();
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${colors[roleStr] || colors.GUEST}`}>
      {roleStr}
    </span>
  );
};

const Badge = ({ condition, label, colorOn, colorOff }: { condition: boolean; label: string; colorOn: string; colorOff: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${condition ? colorOn : colorOff}`}>
    {label}
  </span>
);
// ------------------------------------------------------------------

export function UsersTable({ users }: { users: AdminUserListItem[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        Aucun utilisateur trouvé dans la base de données.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['ID', 'Nom', 'Email', 'Vérifié', 'Rôle', '2FA', 'État', 'Sécurité', 'Activité', 'Créé le'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.map((u) => {
              const security = u.userSecurities[0];
              const isBlocked = security?.isBlocked ?? false;
              const isDeleted = u.userAudit?.isDeleted ?? false;
              const hasPassword = !!u.accounts[0]?.password;
              
              // Détermination de la couleur de ligne pour l'anti-fragilité visuelle
              const rowBg = isDeleted ? 'bg-red-50/50' : isBlocked ? 'bg-amber-50/50' : 'bg-white';
              const rowOpacity = isDeleted ? 'opacity-70' : 'opacity-100';

              return (
                <tr key={u.id} className={`transition-colors hover:bg-slate-50 ${rowBg} ${rowOpacity}`}>
                  <td className="whitespace-nowrap px-3 py-4 text-xs font-mono text-slate-500" title={u.id}>
                    {u.id.slice(0, 8)}...
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900">
                    {u.name || <span className="italic text-slate-400">Non défini</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">{u.email}</td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <Badge
                      condition={!!u.emailVerified}
                      label="Oui"
                      colorOn="bg-emerald-100 text-emerald-700"
                      colorOff="bg-slate-100 text-slate-400"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">{formatRole(u.roleConfig?.role)}</td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <Badge
                      condition={!!security?.twoFactorEnabled}
                      label="ON"
                      colorOn="bg-purple-100 text-purple-700"
                      colorOff="bg-slate-100 text-slate-400"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs">
                    {isDeleted ? (
                      <span className="text-red-600 font-medium">Supprimé</span>
                    ) : isBlocked ? (
                      <span className="text-amber-600 font-medium" title={security?.blockReason || ''}>
                        Bloqué {security?.blockedUntil ? `(jusqu'au ${formatDate(security.blockedUntil)})` : ''}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Actif</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span>Mdp: {hasPassword ? 'Défini' : 'Aucun'}</span>
                      <span>Cmd: {u._count.orders}</span>
                      <span>Prod: {u.userQuotas[0]?.productCount ?? 0}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                    <div className="flex flex-col gap-1">
                      <span>V: {u.userAudit?.version ?? 1}</span>
                      <span>{formatDate(u.updatedAt)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pied de tableau */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600">
          Affichage de <span className="font-semibold text-slate-900">{users.length}</span> utilisateur(s)
          {users.filter(u => u.userAudit?.isDeleted).length > 0 && (
            <span className="text-red-600"> (dont {users.filter(u => u.userAudit?.isDeleted).length} supprimé(s))</span>
          )}
        </p>
      </div>
    </div>
  );
}
