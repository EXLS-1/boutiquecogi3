import { Metadata } from "next";
import { Profile } from "@/components/profile";

// Optimisation SEO : Métadonnées injectées directement par le serveur
export const metadata: Metadata = {
    title: "Profile | Boutique COGI",
    description: "Consultez vos identifiants, vos commandes et vos préférences.",
};

export default function ProfilePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-cyan-100 text-cyan-500 p-4">
            <LoginForm />
        </main>
    );
}
