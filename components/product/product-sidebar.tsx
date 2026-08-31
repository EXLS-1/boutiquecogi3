// components/product/product-sidebar.tsx
/**
 * =============================================================================
 * ProductSidebar — Colonne latérale de la page produit (Server Component)
 * =============================================================================
 * Regroupe les informations secondaires : disponibilité / stock, entrepôt,
 * nombre de variantes, tags et fiscalité. Purement présentationnel : aucune
 * donnée n'est récupérée ici, tout est passé via la prop `product`.
 */

import type { ProductDetailData } from "@/lib/product-catalog/product-detail";

interface ProductSidebarProps {
    readonly product: ProductDetailData;
}

export function ProductSidebar({ product }: ProductSidebarProps) {
    const availabilityLabel =
        product.availabilityStatus === "in_stock" ? "En stock" :
        product.availabilityStatus === "pre_order" ? "Précommande" :
        "Rupture de stock";

    const availabilityColor =
        product.availabilityStatus === "in_stock" ? "text-green-700 bg-green-50 border-green-200" :
        product.availabilityStatus === "pre_order" ? "text-amber-700 bg-amber-50 border-amber-200" :
        "text-red-700 bg-red-50 border-red-200";

    return (
        <aside className="space-y-4" aria-label="Informations produit">
            {/* Disponibilité */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Disponibilité</h3>
                <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full border ${availabilityColor}`}>
                    {availabilityLabel}
                </span>
                <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Stock total</dt>
                        <dd className="text-slate-900 font-medium">{product.totalStock}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Disponible</dt>
                        <dd className="text-slate-900 font-medium">{product.availableStock}</dd>
                    </div>
                    {product.stock?.warehouse && (
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Entrepôt</dt>
                            <dd className="text-slate-900 font-medium truncate">
                                {product.stock.warehouse}
                            </dd>
                        </div>
                    )}
                    {product.soldCount > 0 && (
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Vendus</dt>
                            <dd className="text-slate-900 font-medium">{product.soldCount}</dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Variantes */}
            {product.variants.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Variantes</h3>
                    <p className="text-sm text-slate-500">
                        {product.variants.length} variante{product.variants.length > 1 ? "s" : ""} disponible
                        {product.variants.length > 1 ? "s" : ""}
                    </p>
                </div>
            )}

            {/* Tags */}
            {product.tags.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {product.tags.map((tag) => (
                            <span
                                key={tag.id}
                                className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded"
                            >
                                #{tag.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Fiscalité & métadonnées */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5 text-sm">
                {product.taxClass && (
                    <div className="flex justify-between gap-2">
                        <span className="text-slate-500">TVA ({product.taxClass.name})</span>
                        <span className="text-slate-900 font-medium">{product.taxClass.rate}%</span>
                    </div>
                )}
                <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Référence</span>
                    <span className="text-slate-900 font-mono text-xs">{product.sku}</span>
                </div>
            </div>
        </aside>
    );
}
