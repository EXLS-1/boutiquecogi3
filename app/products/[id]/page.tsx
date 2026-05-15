import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProductDetail } from "@/components/product-detail";
import { ProductNotFound } from "./products-not-found";
import { getProductById, getAllProducts } from "@/lib/products";

export const revalidate = 60;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  try {
    const products = await getAllProducts();
    return products.map((p) => ({ id: p.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return { title: "Produit introuvable | Boutique COGI" };
  }

  return {
    title: `${product.name} | Boutique COGI`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image ? [{ url: product.image }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  try {
    const product = await getProductById(id);
    if (!product) notFound();

    return (
      <main className="min-h-screen pt-20">
        <div className="container mx-auto px-4">
          <ProductDetail product={product} />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Erreur chargement produit:", error);
    return <ProductNotFound />;
  }
}
