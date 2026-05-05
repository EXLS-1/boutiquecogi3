import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

// Optimisation SEO : Métadonnées injectées directement par le serveur
export const metadata: Metadata = {
    title: "Connexion | Boutique COGI",
    description: "Connectez-vous pour gérer vos commandes et préférences.",
};

export default function ForgotPasswordPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-500 p-4">
            <ForgotPasswordForm />
        </main>
    );
}