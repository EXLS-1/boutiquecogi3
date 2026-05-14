// /app/403/page.tsx
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-6">
      {/* Illustration simple */}
      <div className="mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-32 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m0 3.75h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Texte principal */}
      <h1 className="text-4xl font-semibold text-red-600 mb-4">403 - Accès interdit</h1>
      <p className="text-lg text-zinc-700 mb-6 text-center max-w-md">
        Vous n’avez pas les permissions nécessaires pour accéder à cette page.
        Si vous pensez qu’il s’agit d’une erreur, contactez un administrateur.
      </p>

      {/* Bouton retour */}
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
