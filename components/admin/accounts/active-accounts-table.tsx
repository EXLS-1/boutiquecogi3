// components/admin/accounts/active-accounts-table.tsx
import Link from 'next/link';
import type { AccountListItem } from '@/lib/super_admin/accounts';

const formatDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d) : '-';

const Badge = ({ condition, label, colorOn, colorOff }: { condition: boolean; label: string; colorOn: string; colorOff: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${condition ? colorOn : colorOff}`}>
    {label}
  </span>
);

export function ActiveAccountsTable({ 
  accounts, 
  pagination, 
  providers, 
  filters 
}: { 
  accounts: AccountListItem[]; 
  pagination: any; 
  providers: string[]; 
  filters: any;
}) {
  if (accounts.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">Aucun compte trouvé.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['ID', 'Fournisseur', 'Type', 'Utilisateur', 'État', 'Sécurité', 'Tokens', 'Créé le'].map((h) => (
                <th key={h} className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {accounts.map((a) => {
              const isDeleted = a.user?.isDeleted ?? false;
              const isBlocked = a.user?.isBlocked ?? false;
              const rowBg = isDeleted ? 'bg-red-50/50' : isBlocked ? 'bg-amber-50/50' : 'bg-white';

              return (
                <tr key={a.id} className={`transition-colors hover:bg-slate-50 ${rowBg} ${isDeleted ? 'opacity-70' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-4 text-xs font-mono text-slate-500" title={a.id}>{a.id.slice(0, 8)}...</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium capitalize text-slate-900">{a.providerId}</td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${a.type === 'oauth' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">
                    {a.user ? (
                      <div>
                        <p className="text-sm font-medium text-slate-900">{a.user.name || 'Sans nom'}</p>
                        <p className="text-xs text-slate-500">{a.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm italic text-slate-400">Orphelin</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs">
                    {isDeleted ? <span className="font-medium text-red-600">Supprimé</span> : 
                     isBlocked ? <span className="font-medium text-amber-600">Bloqué</span> : 
                     <span className="font-medium text-emerald-600">Actif</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <Badge condition={a.hasPassword} label="Mdp: Oui" colorOn="bg-emerald-100 text-emerald-700" colorOff="bg-slate-100 text-slate-400" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span>Refresh: {a.hasRefreshToken ? 'Présent' : 'Non'}</span>
                      <span>Access: {a.hasAccessToken ? 'Présent' : 'Non'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">{formatDate(a.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex justify-between items-center">
        <p className="text-sm text-slate-600">Affichage de {accounts.length} compte(s)</p>
        {/* Intégrez ici votre composant de Pagination atomique si vous en avez un */}
      </div>
    </div>
  );
}
