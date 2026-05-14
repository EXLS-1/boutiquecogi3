import { ProductSchema } from "@/lib/validators/product.schema";

export function mapProduct(product: unknown) {
  const validated = ProductSchema.parse(product);

  return {
    id: validated.id,

    name: validated.name,

    description: validated.description ?? "",

    price: validated.price,

    image: validated.images[0] ?? "/placeholder.jpg",

    category: validated.category,
  };
}

export function mapProducts(products: unknown[]) {
  return products.map((product) => mapProduct(product));
}