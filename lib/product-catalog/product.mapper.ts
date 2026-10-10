// lib/mappers/product.mapper.ts
import { z } from "zod";
import { serializeDecimal } from "./catalog-types";

const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.unknown(),
  images: z.array(z.string().min(1)).default([]),
  category: z.string().nullable().optional(),
});

export function mapProduct(product: unknown) {
  const validated = ProductSchema.parse(product);

  return {
    id: validated.id,
    name: validated.name,
    description: validated.description ?? "",
    price: serializeDecimal(validated.price),
    image: validated.images[0] ?? "/placeholder.webp",
    category: validated.category ?? null,
  };
}

export function mapProducts(products: unknown[]) {
  return products.map((product) => mapProduct(product));
}