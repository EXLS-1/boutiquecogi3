// app/products/[id]/page.tsx

import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isValidUuid } from "@/lib/utils";

import { ProductNotFound } from "./products-not-found";

import {
  mapProductDetail,
  type ProductDetailData,
} from "@/lib/product-catalog/product-detail";

export const revalidate = 3600;

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const products =
      await prisma.product.findMany({
        where: {
          isArchived: false,
          isdeleted: false,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    return products.map(
      (product) => ({
        id: product.id,
      }),
    );
  } catch (error) {
    console.error(
      "generateStaticParams error:",
      error,
    );

    return [];
  }
}

const getProductData = cache(
  async (id: string): Promise<ProductDetailData | null> => {
    // Si l'identifiant n'est pas un UUID valide, on interroge uniquement le slug
    // pour éviter l'erreur "invalid input syntax for type uuid" de PostgreSQL.
    const whereClause = isValidUuid(id)
      ? {
          OR: [{ id }, { slug: id }],
          isArchived: false,
          isdeleted: false,
          deletedAt: null,
        }
      : {
          slug: id,
          isArchived: false,
          isdeleted: false,
          deletedAt: null,
        };

    const product = await prisma.product.findFirst({
      where: whereClause,

      include: {
        // Catégorie
        category: true,

        // Stock (quantité, réservé, seuil d'alerte, entrepôt)
        stock: true,

        // Projection de disponibilité
        availabilityProjection: true,

        // Images produit (ordonnées par position)
        productImages: {
          orderBy: {
            position: "asc",
          },
        },

        // Variantes (SKU, attributs, prix additionnel)
        variants: true,

        // Options produit (taille, couleur, etc.)
        productOptions: true,

        // Tags (via table de jointure)
        productTags: {
          include: {
            tag: true,
          },
        },

        // Attributs personnalisés (via table de jointure)
        productAttributeValues: {
          include: {
            attribute: true,
          },
        },

        // Avis clients (avec utilisateur)
        productReviews: {
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        // Prix régionaux
        productPrices: true,

        // Coupon de promotion
        coupon: true,

        // Classe de taxe
        taxClass: true,
      },
    });

    if (!product) {
      return null;
    }

    return mapProductDetail(product as Parameters<typeof mapProductDetail>[0]);
  },
);

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;

  const product = await getProductData(id);

  if (!product) {
    return {
      title: "Produit introuvable | Boutique COGI",
    };
  }

  const mainImage =
    product.productImages[0]?.url ?? product.images[0] ?? null;

  return {
    title: product.seoTitle ?? `${product.name} | Boutique COGI`,
    description:
      product.seoDescription ?? product.description ?? product.name,
    openGraph: {
      title: product.name,
      description: product.description ?? product.name,
      images: mainImage
        ? [
            {
              url: mainImage,
            },
          ]
        : [],
    },
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { id } = await params;

  let product: ProductDetailData | null = null;

  try {
    product = await getProductData(id);
  } catch (error) {
    console.error("Product page error:", error);
    return <ProductNotFound />;
  }

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen pt-20 bg-background">
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li><span className="hover:text-foreground cursor-pointer">Accueil</span></li>
            <li>/</li>
            {product.category && (
              <>
                <li><span className="hover:text-foreground cursor-pointer">{product.category.name}</span></li>
                <li>/</li>
              </>
            )}
            <li className="text-foreground font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <ProductImageGallery images={product.productImages} videoUrl={product.videoUrl} productName={product.name} />
          <ProductInfo product={product} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {product.description && (
              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-3">Description</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </section>
            )}
            {product.attributes.length > 0 && <ProductAttributes attributes={product.attributes} />}
            {product.reviews.length > 0 && <ProductReviews reviews={product.reviews} reviewCount={product.reviewCount} />}
          </div>
          <ProductSidebar product={product} />
        </div>
      </div>
    </main>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS (Server Components inline)
// ═════════════════════════════════════════════════════════════════════════════

function ProductImageGallery({
  images,
  videoUrl,
  productName,
}: {
  images: ProductDetailData["productImages"];
  videoUrl: string | null;
  productName: string;
}) {
  if (images.length === 0 && !videoUrl) {
    return (
      <div className="aspect-square w-full bg-slate-100 rounded-lg flex items-center justify-center">
        <span className="text-slate-400">Aucune image disponible</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="aspect-square w-full bg-slate-100 rounded-lg overflow-hidden">
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0].url}
            alt={images[0].alt ?? productName}
            className="w-full h-full object-cover"
          />
        ) : videoUrl ? (
          <video src={videoUrl} controls className="w-full h-full object-cover" />
        ) : null}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              className="shrink-0 w-16 h-16 rounded border border-slate-200 overflow-hidden hover:border-cyan-400 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? `${productName} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductInfo({ product }: { product: ProductDetailData }) {
  return (
    <div className="flex flex-col gap-4">
      {product.category && (
        <span className="text-sm font-medium text-cyan-600 uppercase tracking-wide">
          {product.category.name}
        </span>
      )}
      <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
      {product.reviewCount > 0 && (
        <div className="flex items-center gap-2">
          <StarRating rating={product.averageRating} />
          <span className="text-sm text-muted-foreground">({product.reviewCount} avis)</span>
        </div>
      )}
      <ProductPriceSection product={product} />
      {product.description && (
        <p className="text-slate-600 leading-relaxed line-clamp-3">{product.description}</p>
      )}
      <StockInfo product={product} />
      {product.variants.length > 0 && <ProductVariants variants={product.variants} />}
      {product.productOptions.length > 0 && <ProductOptions options={product.productOptions} />}
      {product.coupon && <CouponBadge coupon={product.coupon} />}
      <button
        type="button"
        disabled={product.availabilityStatus === "out_of_stock"}
        className="mt-4 w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
      >
        {product.availabilityStatus === "in_stock"
          ? "Ajouter au panier"
          : product.availabilityStatus === "pre_order"
            ? "Précommander"
            : "Indisponible"}
      </button>
    </div>
  );
}


function ProductAttributes({
  attributes,
}: {
  attributes: ProductDetailData["attributes"];
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900 mb-3">Caractéristiques</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attributes.map((attr) => (
          <div key={attr.id} className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-sm text-slate-500">{attr.name}</dt>
            <dd className="text-sm font-medium text-slate-900">{attr.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}



// ═════════════════════════════════════════════════════════════════════════════
// COMPOSANTS AUXILIAIRES (définis pour résoudre jsx-no-undef / ts(2304))
// ═════════════════════════════════════════════════════════════════════════════

function StarRating({ rating }: { rating: number }) {
  const safeRating = Number.isFinite(rating)
    ? Math.min(5, Math.max(0, rating))
    : 0;

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Note : ${safeRating.toFixed(1)} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(safeRating)
              ? "text-amber-400"
              : "text-slate-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.783.57-1.838-.196-1.538-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.287-3.958z" />
        </svg>
      ))}
    </span>
  );
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function ProductPriceSection({ product }: { product: ProductDetailData }) {
  const hasSale =
    product.salePrice !== null && product.salePrice < product.basePrice;

  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="text-3xl font-bold text-slate-900">
        {formatPrice(
          hasSale ? product.salePrice : product.basePrice,
          product.currency,
        )}
      </span>
      {hasSale && (
        <>
          <span className="text-lg text-slate-400 line-through">
            {formatPrice(product.basePrice, product.currency)}
          </span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            -{Math.round(
              ((product.basePrice - product.salePrice) / product.basePrice) * 100,
            )}
            %
          </span>
        </>
      )}
    </div>
  );
}

function StockInfo({ product }: { product: ProductDetailData }) {
  const status = product.availabilityStatus;

  if (status === "out_of_stock") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Rupture de stock
      </div>
    );
  }

  if (status === "pre_order") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        Précommande disponible
      </div>
    );
  }

  if (status === "low_stock") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Stock faible — {product.availableStock} restant(s)
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      En stock{product.availableStock > 0 ? ` — ${product.availableStock} disponible(s)` : ""}
    </div>
  );
}


function ProductVariants({
  variants,
}: {
  variants: ProductDetailData["variants"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">Variantes :</span>
      <ul className="flex flex-col gap-1">
        {variants.map((variant) => (
          <li
            key={variant.id}
            className="flex items-center justify-between text-sm text-slate-600 border-b border-slate-100 py-1"
          >
            <span>
              <span className="font-mono text-xs text-slate-500">
                {variant.sku}
              </span>
              {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                <span className="ml-2 text-slate-500">
                  {Object.entries(variant.attributes)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(", ")}
                </span>
              )}
            </span>
            {variant.priceOffset !== 0 && (
              <span className="font-medium">
                {variant.priceOffset > 0 ? "+" : ""}
                {formatPrice(variant.priceOffset, "USD")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductOptions({
  options,
}: {
  options: ProductDetailData["productOptions"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">Options :</span>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li
            key={option.id}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
          >
            <span className="font-medium">{option.name}</span> : {option.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CouponBadge({ coupon }: { coupon: NonNullable<ProductDetailData["coupon"]> }) {
  const isPercentage = coupon.discountType === "PERCENTAGE";
  // Comparaison de dates sans Date.now() pendant le rendu (purity) :
  // la date d'expiration est affichée, la validité est jugée côté serveur.
  const expiryLabel = new Date(coupon.expiresAt).toLocaleDateString("fr-FR");

  // Ce composant est un Server Component rendu avec revalidate = 3600 :
  // l'appel impure ici est volontaire et stable au moment du build/revalidate.
  // eslint-disable-next-line react-hooks/purity
  const isExpired = new Date(coupon.expiresAt).getTime() < Date.now();

  if (!coupon.isActive || isExpired) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-sm">
      <span className="font-mono font-bold text-emerald-700">{coupon.code}</span>
      <span className="text-emerald-600">
        — {isPercentage
          ? `${coupon.discountValue}% de réduction`
          : `${formatPrice(coupon.discountValue, "USD")} de réduction`}
      </span>
      {coupon.minOrderValue !== null && (
        <span className="text-xs text-emerald-500">
          (dès {formatPrice(coupon.minOrderValue, "USD")})
        </span>
      )}
      <span className="text-xs text-emerald-500">valable jusqu&apos;au {expiryLabel}</span>
    </div>
  );
}




function ProductReviews({
  reviews,
  reviewCount,
}: {
  reviews: ProductDetailData["reviews"];
  reviewCount: number;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900 mb-3">
        Avis clients ({reviewCount})
      </h2>
      <div className="flex flex-col gap-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-lg border border-slate-100 bg-white p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              {review.userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.userImage}
                  alt={review.userName ?? "Avatar"}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                  {(review.userName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">
                  {review.userName ?? "Utilisateur anonyme"}
                </span>
                <StarRating rating={review.rating} />
              </div>
              {review.isVerifiedPurchase && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Achat vérifié
                </span>
              )}
            </div>
            {review.comment && (
              <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
            )}
            <time className="mt-2 block text-xs text-slate-400">
              {new Date(review.createdAt).toLocaleDateString("fr-FR")}
            </time>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductSidebar({ product }: { product: ProductDetailData }) {
  const availabilityLabel =
    product.availabilityStatus === "in_stock"
      ? "En stock"
      : product.availabilityStatus === "pre_order"
        ? "Précommande"
        : "Rupture de stock";

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Informations produit</h2>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">SKU</dt>
          <dd className="font-mono text-slate-900">{product.sku}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Disponibilité</dt>
          <dd className="font-medium text-slate-900">{availabilityLabel}</dd>
        </div>
        {product.taxClass && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Taxe ({product.taxClass.name})</dt>
            <dd className="text-slate-900">{product.taxClass.rate}%</dd>
          </div>
        )}
        {product.soldCount > 0 && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Vendus</dt>
            <dd className="text-slate-900">{product.soldCount}</dd>
          </div>
        )}
      </dl>

      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}
