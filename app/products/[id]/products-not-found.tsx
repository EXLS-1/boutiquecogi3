// app/products/[id]/products-not-found.tsx
import Link from "next/link";
import { SearchX, Home, ShoppingBag } from "lucide-react";

export function ProductNotFound() {
  return (
    <main role="alert" className="min-h-[70vh] flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative flex justify-center items-center py-10">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 select-none">
            <span className="text-9xl font-bold tracking-tighter">404</span>
          </div>
          {/* Remplacement de FontAwesome par Lucide React */}
          <SearchX className="h-24 w-24 text-muted-foreground relative z-10" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-foreground">
            Produit Introuvable
          </h1>
          <p className="text-muted-foreground font-lato leading-relaxed">
            Désolé, l&apos;article que vous recherchez semble être épuisé ou n&apos;est plus disponible.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors duration-200 shadow-sm uppercase tracking-widest gap-2"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-6 py-3 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent hover:text-accent-foreground transition-colors duration-200 uppercase tracking-widest gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Voir les collections
          </Link>
        </div>
        
        <p className="text-sm text-muted-foreground pt-8">
          Besoin d’aide ? <Link href="/contact" className="underline hover:text-cyan-600 transition-colors">Contactez notre support</Link>
        </p>
      </div>
    </main>
  );
}