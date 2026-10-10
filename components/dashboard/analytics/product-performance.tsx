export interface ProductPerformanceRow {
  id: string;
  name: string;
  soldCount: number;
  /** Chiffre d'affaires en unités majeures (converti depuis Decimal côté page). */
  revenue: number;
}

export function ProductPerformance({ products = [] }: { products?: ProductPerformanceRow[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      Product performance · {products.length} produit{products.length > 1 ? "s" : ""}
    </div>
  );
}
