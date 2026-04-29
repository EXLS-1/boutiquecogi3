"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        await authClient.signIn.email({
            email,
            password,
            callbackURL: "/",
        }, {
            onRequest: () => setLoading(true),
            onSuccess: () => router.push("/"),
            onError: (ctx) => alert(ctx.error.message),
        });
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
                <h1 className="text-2xl font-bold text-turquoise-500">Connexion</h1>
                <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-rose-500 outline-none transition-all"
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Mot de passe" 
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-3 text-white focus:border-rose-500 outline-none transition-all"
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                />
                <button 
                    disabled={loading}
                    className="w-full rounded-md bg-rose-600 py-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? "Chargement..." : "Se connecter"}
                </button>
            </form>
        </div>
    );
}