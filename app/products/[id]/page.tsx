import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductDetail } from "@/components/product-detail";
import { ProductNotFound } from "./products-not-found"; // composant séparé (voir plus bas)
import { ProductIdSchema, ProductSchema } from "@/lib/validation-product"; // Importation des schémas de validation

export const revalidate = 60;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Génération statique des pages (ISR)
export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      select: { id: true },
    });
    return products.map((p) => ({ id: p.id }));
  } catch (error) {
    console.error("generateStaticParams error:", error);
    return [];
  }
}

// Métadonnées SEO
export async function generateMetadata(
  { params }: ProductPageProps
): Promise<Metadata> {
  const { id } = await params;
  const { id: validatedId } = ProductIdSchema.parse({ id });

  try {
    const product = await prisma.product.findUnique({
      where: { id: validatedId },
      select: { name: true, description: true, images: true },
    });

    if (!product) {
      return { title: "Produit introuvable | Boutique COGI" };
    }

    return {
      title: `${product.name} | Boutique COGI`,
      description: product.description ?? "",
      openGraph: {
        title: product.name,
        description: product.description ?? "",
        images: product.images?.[0] ? [{ url: product.images[0] }] : [],
      },
    };
  } catch (error) {
    console.error("generateMetadata error:", error);
    return { title: "Erreur | Boutique COGI" };
  }
}

// Page principale
export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const { id: validatedId } = ProductIdSchema.parse({ id });
  if (!validatedId) {
    console.error("ID produit invalide:", id);
    notFound();
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: validatedId, isArchived: false },
    });

    if (!product) notFound();

    // Validation finale avec le schéma complet
    const formattedProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] ?? "/placeholder.jpg",
      description: product.description ?? "",
      category: product.category,
    });

    return (
      <main className="min-h-screen pt-20">
        <div className="container mx-auto px-4">
          <ProductDetail product={formattedProduct} />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Erreur chargement produit:", error);
    return <ProductNotFound />;
  }
}
