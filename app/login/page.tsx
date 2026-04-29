"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client"; // TON nouveau client

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    await authClient.signIn.email({
      email,
      password,
    }, {
      onRequest: () => {
        setIsPending(true);
      },
      onSuccess: () => {
        router.push("/");
        router.refresh(); // Crucial pour forcer le proxy à re-valider la session
      },
      onError: (ctx) => {
        setIsPending(false);
        alert(ctx.error.message || "Erreur de connexion");
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-turquoise-500">Connexion</h1>
          <p className="text-sm text-zinc-400">Entre tes identifiants pour accéder à la boutique</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-white outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
              placeholder="nom@exemple.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-white outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {isPending ? "Vérification..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}