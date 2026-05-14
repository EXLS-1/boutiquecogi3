// app/products/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ProductSchema } from "@/lib/validator/product.schema.ts";
import { unstable_cache } from "next/cache";

export const revalidate = 300; // ISR toutes les 5 minutes

// Mise en cache manuelle optionnelle (plus robuste)
const getProducts = unstable_cache(
  async () => {
    try {
      const products = await prisma.product.findMany({
        where: { isArchived: false },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          price: true,
          images: true,
          description: true,
          category: true,
        },
      });

      // Validation et formatage
      return products.map((p) => {
        const validated = ProductSchema.parse({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.images?.[0] ?? "/placeholder.jpg",
          description: p.description ?? "",
          category: p.category ?? "general",
        });
        return validated;
      });
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      return []; // fallback silencieux
    }
  },
  ["products-list"],
  { revalidate: 300 }
);

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center">
          Tous les produits
        </h1>
      </header>
      {products.length === 0 ? (
        <p className="text-center text-gray-500">
          Aucun produit disponible pour le moment.
        </p>
      ) : (
        <ProductList title="Catalogue" products={products} />
      )}
    </main>
  );
}
