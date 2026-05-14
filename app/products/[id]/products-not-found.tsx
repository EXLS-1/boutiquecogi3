import Link from "next/link";
Import { SearchX } from "lucide-react";

export function ProductNotFound() {
  return (
    <main role="alert" className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative flex justify-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-9xl font-bold tracking-tighter">404</span>
          </div>
          <i className="fas fa-search-minus text-6xl text-gray-300 relative z-10"></i>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900">
            Produit Introuvable
          </h1>
          <p className="text-gray-500 font-lato leading-relaxed">
            Désolé, l&apos;article que vous recherchez semble être épuisé ou n&apos;est plus disponible.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors duration-200 shadow-sm"
          >
            <i className="fas fa-home mr-2"></i>
            Retour à l’accueil
          </Link>
          <Link
            href="/#boutique"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            Voir les collections
          </Link>
        </div>
        <p className="text-sm text-gray-400 pt-8">
          Besoin d’aide ? <a href="#contact" className="underline hover:text-black">Contactez notre support</a>
        </p>
      </div>
    </main>
  );
}