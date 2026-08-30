// components/product-recent.tsx
/**
 * =============================================================================
 * PRODUCT RECENT — Boutiquecogi3
 * =============================================================================
 * Section unique "Nouveautés / Produits récents".
 * Filtre les produits de moins de 90 jours, applique les permissions catalogue,
 * et gère les états vide, erreur et skeleton.
 */

"use client";

import { memo } from "react";
import { PackageSearch, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ProductList, ProductListSkeleton } from "@/components/product/product-list";
import { useCatalogPermissions } from "@/hooks/catalog/use-catalog-permissions";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Détermine si un produit est récent (≤ 90 jours depuis sa création). */
export function isRecentProduct(date: Date | string): boolean {
  const createdAt = new Date(date).getTime();
  return Date.now() - createdAt <= NINETY_DAYS_MS;
}

// ─── Sous-composants internes (états) ─────────────────────────────────────────

interface EmptyStateProps {
  readonly message: string;
  readonly showBackLink?: boolean;
  readonly backHref?: string;
  readonly backLabel?: string;
}

function EmptyState({
  message,
  showBackLink = false,
  backHref = "/catalogue",
  backLabel = "Explorer le catalogue",
}: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <PackageSearch
        className="h-12 w-12 text-slate-300 mx-auto mb-4"
        aria-hidden="true"
      />
      <p className="text-slate-500 text-lg">{message}</p>
      {showBackLink && (
        <Link
          href={backHref}
          className="inline-block mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
        >
          {backLabel}
        </Link>
      )}
    </div>
  );
}

interface ErrorStateProps {
  readonly message: string;
  readonly subMessage?: string;
}

function ErrorState({
  message,
  subMessage = "Si le problème persiste, contactez-nous pour un support technique.",
}: ErrorStateProps) {
  return (
    <div className="text-center py-16 border border-red-200 bg-red-50 rounded-xl">
      <AlertTriangle
        className="h-12 w-12 text-red-300 mx-auto mb-4"
        aria-hidden="true"
      />
      <p className="text-red-600 text-lg font-medium">{message}</p>
      {subMessage && (
        <p className="text-red-400 text-sm mt-2">{subMessage}</p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface ProductRecentProps {
  /** Produits bruts (filtrés côté serveur ou injectés depuis un parent). */
  readonly products?: readonly CatalogProduct[];
  /** État d'authentification de l'utilisateur (pour les permissions). */
  readonly isAuthenticated: boolean;
  /** Titre de la section. */
  readonly title?: string;
  /** Sous-titre descriptif. */
  readonly subtitle?: string;
  /** Nombre d'éléments par page (passé à ProductList). */
  readonly pageSize?: number;
  /** Affiche un lien de retour vers le catalogue si la section est vide. */
  readonly showBackLink?: boolean;
  /** URL du lien de retour. */
  readonly backHref?: string;
  /** Label du lien de retour. */
  readonly backLabel?: string;
  /** Force l'affichage de l'état d'erreur (utile si le fetch parent a échoué). */
  readonly hasError?: boolean;
  /** Message d'erreur personnalisé. */
  readonly errorMessage?: string;
}

function ProductRecentComponent({
  products = [],
  isAuthenticated,
  title = "Nouveautés",
  subtitle = "Découvrez nos derniers arrivages",
  pageSize = 8,
  showBackLink = false,
  backHref = "/catalogue",
  backLabel = "Explorer le catalogue",
  hasError = false,
  errorMessage = "Impossible de charger les nouveautés. Veuillez réessayer.",
}: ProductRecentProps) {
  const { filterProducts } = useCatalogPermissions({ isAuthenticated });

  // Permissions + filtre métier 90 jours (DRY : une seule source de vérité)
  const recentProducts = filterProducts(products).filter((product) =>
    isRecentProduct(product.createdAt)
  );

  return (
    <section aria-labelledby="product-recent-heading" className="py-16">
      <div className="text-center mb-12">
        <h2
          id="product-recent-heading"
          className="text-3xl md:text-4xl font-playfair font-bold uppercase"
        >
          {title}
        </h2>
        <div
          className="w-24 h-1 bg-emerald-500 mx-auto mt-4 rounded-full"
          aria-hidden="true"
        />
        <p className="mt-4 text-slate-500">{subtitle}</p>
      </div>

      {hasError ? (
        <ErrorState message={errorMessage} />
      ) : recentProducts.length === 0 ? (
        <EmptyState
          message="Aucune nouveauté disponible pour le moment."
          showBackLink={showBackLink}
          backHref={backHref}
          backLabel={backLabel}
        />
      ) : (
        <ProductList
          products={recentProducts}
          totalCount={recentProducts.length}
          pageSize={pageSize}
        />
      )}
    </section>
  );
}

export const ProductRecent = memo(ProductRecentComponent);
ProductRecent.displayName = "ProductRecent";

// ─── Alias de compatibilité ───────────────────────────────────────────────────

/** Alias legacy pour l'ancien `NewProductCategory`. */
export const NewProductCategory = ProductRecent;

/** Alias legacy pour l'ancien `RecentProducts`. */
export const RecentProducts = ProductRecent;

/** Alias pour `RecentProductsSection` utilisé dans la page catalogue. */
export const RecentProductsSection = ProductRecent;

// ─── Skeleton (pour Suspense côté serveur) ───────────────────────────────────

interface ProductRecentSkeletonProps {
  readonly count?: number;
}

export function ProductRecentSkeleton({ count = 8 }: ProductRecentSkeletonProps) {
  return (
    <section className="py-16">
      <div className="text-center mb-12 space-y-4">
        <div className="h-10 w-56 bg-slate-200 rounded mx-auto animate-pulse" />
        <div className="w-24 h-1 bg-slate-200 mx-auto rounded-full animate-pulse" />
        <div className="h-5 w-80 bg-slate-200 rounded mx-auto animate-pulse" />
      </div>
      <ProductListSkeleton count={count} />
    </section>
  );
}