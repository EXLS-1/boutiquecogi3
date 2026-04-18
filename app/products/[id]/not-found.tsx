import Link from "next/link";

/*
COMPOSANT GLOBAL : Affiché par Next.js pour toute route inexistante (404 globale)
*/
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <h1 className="font-playfair text-7xl font-bold text-gray-900">404</h1>
      
      <h2 className="mt-4 text-xl font-medium text-gray-800">
        Page introuvable
      </h2>
      
      <p className="text-gray-500 mt-2 max-w-sm font-lato">
        Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>

      <Link 
        href="/"
        className="mt-8 rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
      >
        Retour à la boutique
      </Link>
    </div>
  );
}

/*
COMPOSANT SPÉCIFIQUE : À importer manuellement dans tes pages produits
si un article n'existe plus dans la base de données (ex: via Prisma).
*/
export function ProductNotFound() {
  return (
    <main role="alert" className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icône et Arrière-plan stylisé */}
        <div className="relative flex justify-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-9xl font-bold tracking-tighter">404</span>
          </div>
          <i className="fas fa-search-minus text-6xl text-gray-300 relative z-10"></i>
        </div>

        {/* Texte explicatif avec les polices de la charte */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900">
            Produit Introuvable
          </h1>
          <p className="text-gray-500 font-lato leading-relaxed">
            Désolé, l&apos;article que vous recherchez semble être épuisé ou n&apos;existe plus dans notre collection.
          </p>
        </div>

        {/* Actions de navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors duration-200 shadow-sm"
          >
            <i className="fas fa-home mr-2"></i>
            Retour à l&apos;accueil
          </Link>
          
          <Link
            href="/#boutique"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            Voir les collections
          </Link>
        </div>

        {/* Support */}
        <p className="text-sm text-gray-400 pt-8">
          Besoin d&apos;aide ? <a href="#contact" className="underline hover:text-black">Contactez notre support</a>
        </p>
      </div>
    </main>
  );
}