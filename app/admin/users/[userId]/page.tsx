import { notFound } from "next/navigation";
import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { getUserAction } from "@/server/actions/admin/users/get-user";

export default async function AdminUserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getUserAction(userId);
  if (!user) notFound();
  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header><h1 className="text-3xl font-bold text-slate-950">{user.name || user.email}</h1><p className="text-slate-600">{user.email}</p></header>
      <dl className="grid gap-4 md:grid-cols-3">
        <div><dt className="text-muted-foreground">Rôle</dt><dd>{user.role}</dd></div>
        <div><dt className="text-muted-foreground">Statut</dt><dd>{user.status}</dd></div>
        <div><dt className="text-muted-foreground">Version</dt><dd>{user.userAudit?.version ?? 1}</dd></div>
        <div><dt className="text-muted-foreground">Email vérifié</dt><dd>{user.emailVerified ? "Oui" : "Non"}</dd></div>
        <div><dt className="text-muted-foreground">Sessions actives</dt><dd>{user._count.sessions}</dd></div>
        <div><dt className="text-muted-foreground">Commandes</dt><dd>{user._count.orders}</dd></div>
      </dl>
    </main>
  );
}
