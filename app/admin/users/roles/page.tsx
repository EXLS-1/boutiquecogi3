import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { listUserRoleAssignments } from "@/lib/admin/users/user-modules.service";

export const metadata = { title: "Rôles utilisateurs" };

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);
}

export default async function UserRolesPage() {
  let rows: Awaited<ReturnType<typeof listUserRoleAssignments>>;
  let error: string | null = null;

  try {
    rows = await listUserRoleAssignments();
  } catch (e) {
    rows = [];
    error = e instanceof Error ? e.message : "Erreur inattendue.";
  }

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Rôle utilisateur</h1>
        <p className="text-slate-600">Rattachements RBAC, niveaux d'accès et overrides de permissions.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Aucun rattachement trouvé.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Rôle (User)</th>
                <th className="px-4 py-2">Rôle (Assignment)</th>
                <th className="px-4 py-2">Niveau</th>
                <th className="px-4 py-2">Config active</th>
                <th className="px-4 py-2">Assign. bloqué</th>
                <th className="px-4 py-2">Overrides</th>
                <th className="px-4 py-2">Assigné le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.userId}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900">{row.name ?? "—"}</div>
                    <div className="text-slate-500">{row.email}</div>
                  </td>
                  <td className="px-4 py-2">{row.userRole}</td>
                  <td className="px-4 py-2">{row.assignedRole ?? "—"}</td>
                  <td className="px-4 py-2">{row.level ?? "—"}</td>
                  <td className="px-4 py-2">{row.isActive === null ? "—" : row.isActive ? "✅" : "❌"}</td>
                  <td className="px-4 py-2">{row.isBlocked === null ? "—" : row.isBlocked ? "🚫" : "—"}</td>
                  <td className="px-4 py-2">{row.overrideCount}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(row.assignedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}