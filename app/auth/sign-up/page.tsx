import { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

// Optimisation SEO : Métadonnées injectées directement par le serveur
export const metadata: Metadata = {
    title: "Inscription | Boutique COGI",
    description: "Créez votre compte pour gérer vos commandes et préférences.",
};

export default function SignUpPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-500 p-4">
            <SignUpForm />
        </main>
    );
}
