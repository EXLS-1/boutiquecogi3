import Image from 'next/image'
import Link from 'next/link'
import { 
  ChevronRight
} from "lucide-react";

export interface CategoryCardProps {
  title: string
  subtitle: string
  imageSrc: string
  imageAlt: string
  href: string
}

/**
 * Composant de carte réutilisable pour les catégories de la boutique.
 * Optimisé pour Tailwind v4 et Next.js Image.
 */
export function CategoryCard({ title, subtitle, imageSrc, imageAlt, href = "#" }: CategoryCardProps) {
  // Robustesse : On s'assure que src n'est jamais une chaîne vide pour éviter l'erreur Next.js
  const hasValidImage = imageSrc && imageSrc.trim() !== "";

  return (
    <Link 
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-cyan-400/30 hover:-translate-y-1"
    >
      {/* Conteneur d'image optimisé */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
        {hasValidImage ? (
          <Image
            src={imageSrc}
            alt={imageAlt || title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-xs font-medium italic">Image non disponible</span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      
      <div className="flex flex-1 flex-col p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1 uppercase tracking-tight">{title}</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              {subtitle}
            </p>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-cyan-600 transition-colors" />
        </div>
        
        <div className="mt-4 flex items-center text-sm font-semibold text-cyan-700 opacity-0 transition-all duration-300 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
          Découvrir la collection
        </div>
      </div>
    </Link>
  );
}