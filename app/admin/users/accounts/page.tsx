import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { listUserAccounts } from "@/lib/admin/users/user-modules.service";

export const metadata = { title: "Comptes utilisateurs" };

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function UserAccountsPage() {
  let rows: Awaited<ReturnType<typeof listUserAccounts>>;
  let error: string | null = null;

  try {
    rows = await listUserAccounts();
  } catch (e) {
    rows = [];
    error = e instanceof Error ? e.message : "Erreur inattendue.";
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Comptes utilisateurs</h1>
        <p className="text-slate-600">Comptes, sessions, fournisseurs d'authentification et sécurité 2FA.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Aucun compte trouvé.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Fournisseurs</th>
                <th className="px-4 py-2">Sessions</th>
                <th className="px-4 py-2">2FA</th>
                <th className="px-4 py-2">Bloqué</th>
                <th className="px-4 py-2">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900">{row.name ?? "—"}</div>
                    <div className="text-slate-500">{row.email}</div>
                  </td>
                  <td className="px-4 py-2">{row.role}</td>
                  <td className="px-4 py-2">{row.status}</td>
                  <td className="px-4 py-2">{row.providerCount}</td>
                  <td className="px-4 py-2">{row.sessionCount}</td>
                  <td className="px-4 py-2">{row.twoFactorEnabled ? "✅" : "—"}</td>
                  <td className="px-4 py-2">{row.isBlocked ? "🚫" : "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}