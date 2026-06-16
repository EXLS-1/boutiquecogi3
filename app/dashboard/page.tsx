// app/dashboard/page.tsx

import { auth } from "@/lib/auth"; // Ton instance de serveur BetterAuth
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Profile } from "@/components/auth/profile";

export default async function DashboardPage() {
  // 1. Vérification de la session côté serveur (Ultra performant)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // 2. Redirection stricte si non authentifié
  if (!session) {
    redirect("/app/auth/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <h1 className="mb-8 text-3xl font-bold text-Cyan-900">Votre Tableau de Bord</h1>
      
      {/* 3. Injection des données utilisateur dans le composant client */}
      <Profile user={session.user} />
      
      <div className="mt-8 text-sm text-muted-foreground">
        Dernière connexion : {new Date(session.session.createdAt).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "medium" })}
      </div>
    </div>
  );
}