// app/auth/forgot-password/page.tsx
// Next.js 16 avec Better-Auth : Page de mot de passe oublié
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth"; // Ajuste ce chemin selon ton instance Better-Auth
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

// Optimisation SEO : Titre et description professionnels
export const metadata: Metadata = {
  title: "Mot de passe oublié | Boutique COGI",
  description: "Récupérez l'accès à votre compte de manière sécurisée.",
};

export default async function ForgotPasswordPage() {
  // 1. Sécurité & UX (Server-side) : Bloquer l'accès si l'utilisateur est déjà connecté
  // Note : Sur Next.js 16, headers() est asynchrone
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (session?.user) {
    // Redirection immédiate côté serveur pour éviter les clignotements d'interface
    redirect("/protected"); // Ou vers la racine "/" selon le flux de ta boutique
  }

  // 2. Rendu de l'interface pour les utilisateurs non authentifiés
  return (
    <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-900 p-4">
      {/* Encapsulation dans un conteneur contraint (max-w-md) 
        pour garantir que la Card (Zod/Shadcn) ne s'étire pas de manière disproportionnée 
        sur les très grands écrans.
      */}
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}