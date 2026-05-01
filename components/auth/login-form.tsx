"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const router = useRouter();

    // Faire disparaître le message d'erreur après 5 secondes
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 5000);

            return () => clearTimeout(timer); // Nettoyage du timer si le composant est démonté
        }
    }, [errorMessage]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        
        try {
            const response = await authClient.signIn.email({
                email,
                password,
            });

            if (response?.error) {
                setErrorMessage(response.error.message ?? "Une erreur de connexion est survenue.");
                return;
            }

            router.push("/");
            router.refresh(); // Force la mise à jour de l'état d'authentification global
            
        } catch (error: any) {
            setErrorMessage(error?.message || "Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form 
            onSubmit={handleLogin} 
            className="w-full max-w-md space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
        >
            <div className="space-y-2 text-center mb-6">
                <h1 className="text-3xl font-bold text-turquoise-500">Connexion</h1>
                <p className="text-sm text-zinc-400">Accédez à votre espace sécurisé</p>
            </div>

            {errorMessage && (
                <div className="p-3 text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md animate-in fade-in slide-in-from-top-1 duration-300">
                    {errorMessage}
                </div>
            )}

            <div className="space-y-4">
                <input 
                    type="email" 
                    placeholder="Adresse email" 
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all disabled:opacity-50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Mot de passe" 
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all disabled:opacity-50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required 
                />
            </div>

            <button 
                type="submit"
                disabled={loading || !email || !password}
                className="w-full rounded-md bg-rose-600 py-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
                {loading ? "Authentification..." : "Se connecter"}
            </button>
        </form>
    );
}
