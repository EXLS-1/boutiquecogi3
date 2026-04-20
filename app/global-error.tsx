"use client";

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
    <html lang="fr">
      {/* On ajoute le body ici pour que le rendu soit valide si le layout plante */}
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-4">
          <h2 className="text-2xl font-bold text-red-600">
            Une erreur critique est survenue
          </h2>
          <p className="text-gray-600 max-w-md">
            Désolé, un problème inattendu empêche l’affichage de la Boutique COGI. Notre équipe technique a été notifiée pourapporter assistance et y remedier.
          </p>
          <button
            onClick={() => reset()}
            className="rounded bg-black px-6 py-2 text-white transition-colors hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 focus:outline-none"
          >
            Recharger la page
          </button>
        </div>
      </body>
    </html>
  );
}
