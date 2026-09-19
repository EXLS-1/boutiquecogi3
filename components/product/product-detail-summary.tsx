import Price from "@/components/product-price/price";
import type { ProductQuickViewData } from "@/lib/product-catalog/product-quick-view";

/** Prix en cents, avec la même conversion de devise que les cartes. */
export function ProductDetailPrice({ product }: { product: Pick<ProductQuickViewData, "basePrice" | "salePrice" | "currency"> }) {
  const amount = product.salePrice !== null && product.salePrice < product.basePrice
    ? product.salePrice : product.basePrice;
  return <Price amount={amount} originalAmount={product.basePrice} currency={product.currency} size="xl" />;
}

export function ProductAvailability({ product }: { product: Pick<ProductQuickViewData, "availabilityStatus" | "availableStock"> }) {
  const labels: Record<string, string> = {
    in_stock: "En stock",
    low_stock: `Stock faible — ${product.availableStock} restant(s)`,
    pre_order: "Précommande disponible",
    back_order: "Sur commande",
    out_of_stock: "Rupture de stock",
  };
  const label = labels[product.availabilityStatus] || "Non disponible";
  return <p className="text-sm font-medium">{label}</p>;
}
