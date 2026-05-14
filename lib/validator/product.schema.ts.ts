import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  image: z.string().url().optional().default('/placeholder.jpg'),
  description: z.string().optional().default(''),
  category: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  isArchived: z.boolean().optional(),
});

export const ProductIdSchema = z.object({
  id: z.string().min(1, "ID produit requis"),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductId = z.infer<typeof ProductIdSchema>;
