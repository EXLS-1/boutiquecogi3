import { Badge } from "@/components/ui/badge";

type ProductLike = {
  readonly productId?: string;
  readonly isNewArrival?: boolean;
  readonly discountPercent?: number;
  readonly isAvailable?: boolean;
};

export type BadgeProductStatusProps<TProduct extends ProductLike = ProductLike> = {
  readonly product: TProduct;
  readonly showBadge?: boolean;
};

export function BadgeProductStatus<TProduct extends ProductLike = ProductLike>({
  product,
  showBadge = true,
}: BadgeProductStatusProps<TProduct>) {
  if (!showBadge) return null;

  const isNew = !!product.isNewArrival;
  const discountPercent = Number(product.discountPercent ?? 0);
  const hasDiscount = discountPercent > 0;
  const isAvailable = product.isAvailable !== false;

  if (!isNew && !hasDiscount && isAvailable) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {isNew && (
        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
          Nouveau
        </Badge>
      )}

      {hasDiscount && (
        <Badge variant="destructive">-{discountPercent}%</Badge>
      )}

      {!isAvailable && (
        <Badge variant="secondary" className="bg-slate-800 text-white">
          Épuisé
        </Badge>
      )}
    </div>
  );
}

