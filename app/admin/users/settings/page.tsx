import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { getUserSettingsSummary } from "@/lib/admin/users/user-modules.service";

export const metadata = { title: "Paramètres utilisateurs" };

export default async function UserSettingsPage() {
  let summary: Awaited<ReturnType<typeof getUserSettingsSummary>>;
  let error: string | null = null;

  try {
    summary = await getUserSettingsSummary();
  } catch (e) {
    summary = {
      totalUsers: 0,
      preferencesConfigured: 0,
      quotasConfigured: 0,
      twoFactorEnabled: 0,
      blockedUsers: 0,
      byLanguage: [],
    };
    error = e instanceof Error ? e.message : "Erreur inattendue.";
  }

  const cards: { label: string; value: number | string }[] = [
    { label: "Utilisateurs actifs (non supprimés)", value: summary.totalUsers },
    { label: "Préférences configurées", value: summary.preferencesConfigured },
    { label: "Quotas configurés", value: summary.quotasConfigured },
    { label: "2FA activée", value: summary.twoFactorEnabled },
    { label: "Comptes bloqués", value: summary.blockedUsers },
  ];

  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Paramètre utilisateur</h1>
        <p className="text-slate-600">Réglages applicatifs liés à la gestion des comptes.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold text-slate-950">{card.value}</p>
          </article>
        ))}
      </section>

      {summary.byLanguage.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Langues préférées</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {summary.byLanguage.map((l) => (
              <li key={l.language} className="flex justify-between">
                <span>{l.language}</span>
                <span className="font-medium">{l.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}