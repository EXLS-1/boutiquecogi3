/**
 * =============================================================================
 * TRUST SECTION + TRUST CARD
 * =============================================================================
 * Section "Nos engagements" avec cartes de confiance et fallback images.
 * Contient le sous-composant TrustCard encapsulé.
 */

import { ImageWithFallback } from "@/components/ui/image-with-fallback";

// ─── Données statiques des engagements ────────────────────────────────────────

const TRUST_ITEMS = [
  {
    imageSrc: "/images/trust-quality.jpg",
    fallbackSrc: "/images/placeholder-trust.jpg",
    title: "Qualité garantie",
    description: "Tous nos produits sont sélectionnés avec soin.",
  },
  {
    imageSrc: "/images/trust-delivery.jpg",
    fallbackSrc: "/images/placeholder-trust.jpg",
    title: "Livraison rapide",
    description: "Livraison en 24-48h sur toute la Côte d'Ivoire.",
  },
  {
    imageSrc: "/images/trust-support.jpg",
    fallbackSrc: "/images/placeholder-trust.jpg",
    title: "Support client",
    description: "Une équipe à votre écoute 7j/7.",
  },
] as const;

// ─── Trust Card ─────────────────────────────────────────────────────────────

interface TrustCardProps {
  readonly imageSrc: string;
  readonly fallbackSrc: string;
  readonly title: string;
  readonly description: string;
}

function TrustCard({
  imageSrc,
  fallbackSrc,
  title,
  description,
}: TrustCardProps) {
  return (
    <div className="border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <ImageWithFallback
        src={imageSrc}
        fallbackSrc={fallbackSrc}
        alt={title}
        width={400}
        height={250}
        className="w-full h-48 object-cover rounded-lg mb-4"
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+"
      />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

// ─── Trust Section ──────────────────────────────────────────────────────────

/**
 * Section engagements avec 3 cartes de confiance.
 * Composant serveur sans props requises (données statiques).
 */
export function TrustSection() {
  return (
    <section className="mt-24" aria-labelledby="trust-heading">
      <div className="flex flex-col items-center justify-center space-y-4 mb-12">
        <h2
          id="trust-heading"
          className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center text-slate-900"
        >
          Nos engagements
        </h2>
        <div
          className="w-24 h-1 bg-cyan-600 rounded-full"
          aria-hidden="true"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TRUST_ITEMS.map((item) => (
          <TrustCard key={item.title} {...item} />
        ))}
      </div>
    </section>
  );
}
