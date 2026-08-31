// components/product/product-reviews.tsx
/**
 * =============================================================================
 * ProductReviews — Section d'avis clients (Server Component)
 * =============================================================================
 * Affiche la note moyenne, sa distribution par étoiles et la liste des avis.
 * Purement présentationnel : aucune donnée n'est récupérée ici, tout est passé
 * via les props depuis la page serveur (ProductDetailData["reviews"]).
 */

import type { ProductDetailReview } from "@/lib/product-catalog/product-detail";

interface ProductReviewsProps {
    readonly reviews: readonly ProductDetailReview[];
    readonly averageRating: number;
    readonly reviewCount: number;
}

function StarRow({ rating }: { readonly rating: number }) {
    return (
        <div className="flex items-center" aria-label={`${rating} sur 5 étoiles`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <span
                    key={i}
                    className={i < Math.round(rating) ? "text-amber-400" : "text-slate-200"}
                    aria-hidden="true"
                >
                    ★
                </span>
            ))}
        </div>
    );
}

export function ProductReviews({ reviews, averageRating, reviewCount }: ProductReviewsProps) {
    if (reviewCount === 0 || reviews.length === 0) {
        return (
            <section className="mt-12" id="avis">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Avis clients</h2>
                <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-6">
                    Aucun avis pour ce produit pour le moment. Soyez le premier à donner votre avis !
                </p>
            </section>
        );
    }

    // Distribution des notes (1 → 5 étoiles)
    const distribution = Array.from({ length: 5 }, (_, i) => {
        const stars = 5 - i;
        const count = reviews.filter((r) => r.rating === stars).length;
        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
        return { stars, count, pct };
    });

    return (
        <section className="mt-12" id="avis">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Avis clients ({reviewCount})
            </h2>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                {/* Résumé */}
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-4xl font-bold text-slate-900">
                            {averageRating.toFixed(1)}
                        </span>
                        <StarRow rating={averageRating} />
                        <span className="text-xs text-slate-500">
                            {reviewCount} avis
                        </span>
                    </div>

                    {/* Barres de distribution */}
                    <div className="flex-1 w-full space-y-1.5">
                        {distribution.map(({ stars, count, pct }) => (
                            <div key={stars} className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10 shrink-0">{stars} ★</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-400 rounded-full"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-8 text-right shrink-0">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Liste des avis */}
                <ul className="mt-8 divide-y divide-slate-100">
                    {reviews.map((review) => (
                        <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                {review.userImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={review.userImage}
                                        alt={review.userName ?? "Avatar utilisateur"}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                                        {(review.userName ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-slate-900">
                                        {review.userName ?? "Client"}
                                    </span>
                                    {review.isVerifiedPurchase && (
                                        <span className="ml-2 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                            Achat vérifié
                                        </span>
                                    )}
                                </div>
                                <time
                                    dateTime={new Date(review.createdAt).toISOString()}
                                    className="text-xs text-slate-400 shrink-0"
                                >
                                    {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                                </time>
                            </div>
                            <div className="mt-1.5">
                                <StarRow rating={review.rating} />
                            </div>
                            {review.comment && (
                                <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-line">
                                    {review.comment}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

