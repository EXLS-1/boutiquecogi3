// lib/validators/product.schema.ts
import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  image: z.string().optional().default("/placeholder.jpg"),
  description: z.string().optional().default(""),
  category: z.string().optional(),
  images: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

export type ProductSchemaType = z.infer<typeof ProductSchema>;
