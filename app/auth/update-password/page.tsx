// app/auth/update-password/page.tsx
// Next.js 16 avec Better-Auth : Page de mise à jour du mot de passe
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
    title: "Réinitialiser le mot de passe | Boutique COGI",
    description: "Créez un nouveau mot de passe sécurisé pour votre compte.",
};

// Next.js attend désormais que searchParams soit une promesse
export default async function UpdatePasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    
    // Better-Auth utilise généralement 'token' ou 'error' dans l'URL de redirection
    const token = params.token;
    const error = params.error;

    // Si Better-Auth renvoie une erreur dans l'URL (ex: lien expiré)
    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-500 p-4">
                <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Lien invalide</h1>
                    <p className="text-slate-600">Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.</p>
                </div>
            </main>
        );
    }

    // Sécurité : Ne pas rendre le formulaire si aucun token n'est présent dans l'URL
    if (!token) {
        redirect("/auth/forgot-password");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-500 p-4">
            <UpdatePasswordForm token={token as string} />
        </main>
    );
}