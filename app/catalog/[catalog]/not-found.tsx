/**
 * =============================================================================
 * CATALOG NOT FOUND - Boutiquecogi3
 * =============================================================================
 * Page 404 spécifique au catalogue. S'affiche quand une catégorie
 * n'existe pas (ex: /inexistant, /xyz).
 * 
 * Next.js App Router: ce fichier DOIT s'appeler not-found.tsx pour être
 * automatiquement détecté. Si vous voulez un nom personnalisé, vous devez
 * le gérer manuellement via notFound() dans le layout parent.
 * 
 * NOTE: Pour que Next.js utilise ce fichier automatiquement, renommez-le
 * en not-found.tsx. Le nom catalog-not-found.tsx est fourni pour référence
 * si vous préférez une gestion manuelle.
 */

import Link from "next/link";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { PackageSearch, ArrowLeft, Home, Grid3X3 } from "lucide-react";
import { getCatalogCategories } from "@/lib/product-catalog/catalog-queries";
import { PRODUCT_PLACEHOLDER } from "@/lib/product-catalog/catalog-constants";

// ─── Types ──────────────────────────────────────────────────────────────────
interface SuggestedCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly imageUrl: string | null;
}

// ─── Métadonnées ────────────────────────────────────────────────────────────
export const metadata = {
  title: "Catégorie non trouvée | Boutique COGI",
  description:
    "La catégorie que vous recherchez n'existe pas ou a été déplacée. Découvrez nos autres collections.",
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Catégorie non trouvée | Boutique COGI",
    description: "Cette catégorie n'existe pas. Explorez nos collections disponibles.",
    type: "website",
  },
};

// ─── Récupération des catégories suggérées ──────────────────────────────────
async function getSuggestedCategories(): Promise<readonly SuggestedCategory[]> {
  try {
    const categories = await getCatalogCategories();
    // Limiter à 4 catégories pour l'affichage
    return categories.slice(0, 4);
  } catch (error) {
    console.error("[CatalogNotFound] Erreur récupération catégories:", error);
    return [];
  }
}

// ─── Page Principale ─────────────────────────────────────────────────────────
export default async function CatalogNotFound() {
  const suggestedCategories = await getSuggestedCategories();

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* ─── Illustration & Message principal ─────────────────────────── */}
        <div className="text-center mb-16">
          <div className="relative w-48 h-48 mx-auto mb-8">
            <div className="absolute inset-0 bg-slate-100 rounded-full flex items-center justify-center">
              <PackageSearch className="h-20 w-20 text-slate-300" aria-hidden="true" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-cyan-100 rounded-full p-3">
              <span className="text-2xl font-bold text-cyan-600">404</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-slate-900 mb-4">
            Catégorie introuvable
          </h1>
          <p className="text-slate-500 text-lg max-w-lg mx-auto mb-2">
            La catégorie que vous recherchez n&apos;existe pas, a été déplacée,
            ou son nom a changé.
          </p>
          <p className="text-slate-400 text-sm">
            Vérifiez l&apos;URL ou explorez nos collections ci-dessous.
          </p>
        </div>

        {/* ─── Actions rapides ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-colors shadow-sm"
          >
            <Grid3X3 className="h-4 w-4" aria-hidden="true" />
            Voir le catalogue
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Retour à l&apos;accueil
          </Link>
        </div>

        {/* ─── Séparateur ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
            Ou découvrez nos collections
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ─── Catégories suggérées ────────────────────────────────────────── */}
        {suggestedCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestedCategories.map((category) => (
              <SuggestedCategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">
              Impossible de charger les suggestions pour le moment.
            </p>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au catalogue
            </Link>
          </div>
        )}

        {/* ─── Barre de recherche (optionnelle) ──────────────────────────── */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 text-sm mb-4">
            Vous cherchez quelque chose de spécifique ?
          </p>
          <form
            action="/catalogue"
            method="GET"
            className="flex max-w-md mx-auto gap-2"
          >
            <input
              type="search"
              name="searchQuery"
              placeholder="Rechercher un produit..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              aria-label="Rechercher un produit"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Rechercher
            </button>
          </form>
        </div>

        {/* ─── Contact support ────────────────────────────────────────────── */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">
            Besoin d&apos;aide ?{" "}
            <Link
              href="/contact"
              className="text-cyan-600 hover:text-cyan-700 font-medium underline underline-offset-2"
            >
              Contactez notre support
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function SuggestedCategoryCard({
  category,
}: {
  readonly category: SuggestedCategory;
}) {
  return (
    <Link
      href={`/${category.slug}`}
      className="group block border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-40 bg-slate-100">
        <ImageWithFallback
          src={category.imageUrl ?? PRODUCT_PLACEHOLDER}
          fallbackSrc={PRODUCT_PLACEHOLDER}
          alt={category.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-lg">{category.name}</h3>
          <p className="text-white/80 text-sm">Explorer la collection →</p>
        </div>
      </div>
    </Link>
  );
}