import Image from 'next/image'
import Link from 'next/link'

interface CategoryCardProps {
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
export function CategoryCard({ title, subtitle, imageSrc, imageAlt, href }: CategoryCardProps) {
  return (
    <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
        <h3 className="font-playfair text-2xl font-bold mb-2 uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-gray-200 mb-6 font-lato">{subtitle}</p>
        <Link
          href={href}
          className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
        >
          VOIR LA COLLECTION
        </Link>
      </div>
    </div>
  )
}