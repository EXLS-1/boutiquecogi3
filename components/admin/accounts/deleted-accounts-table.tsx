// components/admin/accounts/deleted-accounts-table.tsx
import type { DeletedAccountItem } from '@/lib/super_admin/accounts';

const formatDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) : '-';

export function DeletedAccountsTable({ entries, pagination }: { entries: DeletedAccountItem[]; pagination: any }) {
  if (entries.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">Aucun compte supprimé dans le registre.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['ID Compte', 'ID Utilisateur', 'Fournisseur', 'Date de suppression', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {entries.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-slate-50 bg-red-50/30">
                <td className="whitespace-nowrap px-3 py-4 text-xs font-mono text-slate-500">{e.id.slice(0, 8)}...</td>
                <td className="whitespace-nowrap px-3 py-4 text-xs font-mono text-slate-500">{e.userId.slice(0, 8)}...</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium capitalize text-slate-900">{e.providerId}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600">{formatDate(e.deletedAt)}</td>
                <td className="whitespace-nowrap px-3 py-4">
                  <button className="text-xs font-medium text-cyan-600 hover:text-cyan-800 hover:underline">
                    Restaurer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
