// app/auth/forgot-password/page.tsx
// Page de réinitialisation de mot de passe
import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password";

// Optimisation SEO : Métadonnées injectées directement par le serveur
export const metadata: Metadata = {
    title: "Réinitialiser le mot de passe | Boutique COGI",
    description: "Réinitialisez votre mot de passe pour accéder à votre compte.",
};

export default function ForgotPasswordPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-500 p-4">
            <ForgotPasswordForm />
        </main>
    );
}