import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

// Optimisation SEO : Métadonnées injectées directement par le serveur
export const metadata: Metadata = {
    title: "Connexion | Boutique COGI",
    description: "Connectez-vous pour gérer vos commandes et préférences.",
};

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <LoginForm />
        </main>
    );
}
