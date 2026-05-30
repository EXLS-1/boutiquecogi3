// app/error.tsx

"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }; // Next.js ajoute souvent un 'digest' aux erreurs
  reset: () => void;
}) {
  useEffect(() => {
    // En production, tu pourrais relier ça à un service comme Sentry
    console.error("Erreur globale:", error);
  }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-4">
      <h2 className="text-4xl font-bold text-red-600">Une erreur critique est survenue...</h2>
      <p className="text-cyan-500 max-w-md">
        Désolé, un problème inattendu empêche l&apos;affichage de la Boutique COGI. Notre équipe technique a été notifiée.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-cyan-100 text-cyan-400 px-8 py-3 text-sm font-medium transition-transform hover:scale-105 hover:bg-cyan-400 hover:text-xl hover:text-white active:scale-95"
      >
        Retour à l&apos;accueil.
      </Link>
    </div>
  );
}
