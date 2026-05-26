// app/auth/sign-up/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth"; // Instance Better-Auth serveur
import { SignUpForm } from "@/components/auth/sign-up-form";

// Optimisation SEO : Métadonnées injectées directement par le serveur
export const metadata: Metadata = {
    title: "Inscription | Boutique COGI",
    description: "Créez votre compte pour gérer vos commandes et préférences.",
};

export default async function SignUpPage() {
    // Vérification de session asynchrone pour Next.js 16
        const session = await auth.api.getSession({
            headers: await headers(),
        });
    
        if (session?.user) {
            redirect("/protected"); // Bloque la navigation
        }
    return (
        <main className="flex min-h-screen items-center justify-between bg-cyan-50 text-cyan-400 p-4">
            <SignUpForm />
            <section>
                <div className="text-center">
                    <h1 className="text-8xl font-bold mb-4">Boutique COGI</h1>
                    <p className="text-2xl">
                        Votre destination priviliée pour des produits exclusifs et diversifiés.
                    </p>
                </div>
                <div className="text-center mt-8">
                    <p className="text-lg">
                        Créez un compte pour accéder pleinement à la plateforme.
                    </p>
                </div>
            </section>
        </main>
    );
}
