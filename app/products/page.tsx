// app/products/page.tsx

import { ProductList } from "@/components/product-list";
import { stripe } from "@/lib/stripe";

export const revalidate = 300;

export default async function ProductsPage() {
  const stripeProducts = await stripe.products.list({
    expand: ["data.default_price"],
  });

  const products = stripeProducts.data.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number((p.default_price as any)?.unit_amount ?? 0) / 100,
    image: p.images?.[0] ?? "/placeholder.jpg",
    description: p.description ?? "",
    category: "stripe",
  }));

  return (
    <main className="pb-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        Tous les produits
      </h1>

      <ProductList
        title="Catalogue Stripe"
        products={products}
      />
    </main>
  );
}