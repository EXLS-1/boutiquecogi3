// app/category/[category]/not-found.tsx
import Link from "next/link";
import { FolderX, ArrowLeft, ShoppingBag } from "lucide-react";

export default function CategoryNotFound() {
  return (
    <main 
      role="alert" 
      className="min-h-[75vh] flex items-center justify-center px-4 bg-background"
    >
      <div className="max-w-md w-full text-center space-y-8 p-8 border border-border/50 rounded-2xl bg-card/50 shadow-sm backdrop-blur-sm">
        
        {/* Zone Graphique */}
        <div className="relative flex justify-center items-center py-6">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 select-none pointer-events-none">
            <span className="text-8xl font-extrabold tracking-tighter text-foreground">404</span>
          </div>
          <FolderX 
            className="h-20 w-20 text-muted-foreground relative z-10 animate-pulse" 
            strokeWidth={1.25} 
          />
        </div>
        
        {/* Contenu Textuel */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-playfair font-bold text-foreground tracking-tight">
            Catégorie Introuvable
          </h1>
          <p className="text-muted-foreground font-lato text-sm leading-relaxed max-w-sm mx-auto">
            La catégorie de produits demandée n&apos;existe pas ou a été retirée de notre catalogue commercial.
          </p>
        </div>
        
        {/* Actions de redirection */}
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/category"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-xl text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-200 shadow-sm uppercase tracking-wider gap-2 group text-xs"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Toutes les catégories
          </Link>
          
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-5 py-3 border border-input text-sm font-semibold rounded-xl text-foreground bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 uppercase tracking-wider gap-2 text-xs"
          >
            <ShoppingBag className="h-4 w-4" />
            Voir le catalogue complet
          </Link>
        </div>
        
        {/* Footer d'assistance */}
        <div className="pt-6 border-t border-border/40 text-xs text-muted-foreground">
          Un doute sur un article ?{" "}
          <a href="#contact" className="underline font-medium hover:text-primary transition-colors">
            Contactez notre service client
          </a>
        </div>
        
      </div>
    </main>
  );
}