// app/(protected)/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dans Next.js 16, headers() doit être "await"
  const headersList = await headers();
  
  // Requête directe, sans try/catch inutile. Better-Auth renvoie null si aucune session.
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Bonus d'architecture : Tu pourras utiliser ce layout pour injecter 
  // les données de 'session.user' dans un Provider React si nécessaire.
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Ton header/sidebar protégé ira ici */}
      {children}
    </div>
  );
}