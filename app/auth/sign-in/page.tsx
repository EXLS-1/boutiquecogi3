// app/auth/sign-in/page.tsx
// ============================================
// PAGE DE CONNEXION — Boutiquecogi3
// ============================================
// Optimisée pour la performance :
// - Suppression du appel auth.api.getSession() redondant
//   (la vérification de session est déjà faite par proxy.ts)
// - La page est rendue statiquement et la vérification
//   est déléguée au middleware Edge (proxy.ts)

import { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
    title: "Connexion | Boutique COGI",
    description: "Connectez-vous pour gérer vos commandes et préférences.",
};

export default async function SignInPage() {
    // NOTE: La vérification de session est déléguée à proxy.ts (middleware Edge).
    // Cela évite un appel Prisma/BetterAuth redondant sur le rendu de la page,
    // réduisant la latence perçue et la contention sur le pool de connexions.

    return (
        <main className="flex min-h-screen items-center justify-between bg-cyan-50 text-cyan-400 p-4">
            <section>
                <div className="text-center">
                    <h1 className="text-8xl font-bold mb-4">Boutique COGI</h1>
                    <p className="text-2xl">
                        Votre destination priviliée pour des produits exclusifs et diversifiés.
                    </p>
                </div>
                <div className="text-center mt-8">
                    <p className="text-lg">
                        Renseignez vos identifiants pour accéder à votre compte.
                    </p>
                </div>
            </section>
            <SignInForm />
        </main>
    );
}
