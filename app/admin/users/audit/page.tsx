import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { listUserAuditLogs } from "@/lib/admin/users/user-modules.service";

export const metadata = { title: "Auditlog utilisateurs" };

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function UserAuditPage() {
  let rows: Awaited<ReturnType<typeof listUserAuditLogs>>;
  let error: string | null = null;

  try {
    rows = await listUserAuditLogs(50);
  } catch (e) {
    rows = [];
    error = e instanceof Error ? e.message : "Erreur inattendue.";
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Auditlog utilisateur</h1>
        <p className="text-slate-600">50 derniers événements liés aux comptes et sessions.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Aucun événement d'audit trouvé.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Acteur</th>
                <th className="px-4 py-2">Cible</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2 text-slate-500">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{row.action}</td>
                  <td className="px-4 py-2">{row.actorName ?? row.actorId ?? "Système"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.targetId ?? "—"}</td>
                  <td className="px-4 py-2">{row.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}