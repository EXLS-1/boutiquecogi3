import { z } from "zod";

export const categoryIdSchema = z.string().trim().uuid().transform(id => id.toLowerCase());
const imageSchema = z.string().trim().max(2048).refine(value => {
  if (value === "" || (value.startsWith("/") && !value.startsWith("//"))) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "Image : chemin local ou URL HTTP(S) requis").nullable();
const fields = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  subtitle: z.string().trim().max(200),
  description: z.string().trim().max(10000).nullable(),
  image: imageSchema,
  imageUrl: imageSchema.optional(), // Compatibilité avec l'ancien formulaire.
  parentId: categoryIdSchema.nullable(),
  isNavigable: z.boolean(),
  displayOrder: z.number().int().min(0).max(2147483647),
  OrderBy: z.enum(["asc", "desc"]),
  seoTitle: z.string().trim().max(200).nullable(),
  seoDescription: z.string().trim().max(500).nullable(),
}).strict();
export const createCategorySchema = fields.partial().extend({
  name: fields.shape.name,
});
export const updateCategorySchema = fields.partial().refine(
  value => Object.values(value).some(v => v !== undefined), "Aucune modification fournie",
).refine(value => value.image === undefined || value.imageUrl === undefined,
  "Utilisez image ou imageUrl, pas les deux");
export const categoryAssignmentSchema = z.object({
  productId: categoryIdSchema,
  categoryId: categoryIdSchema,
}).strict();
export type CategoryCreateInput = z.input<typeof createCategorySchema>;
export type CategoryUpdateInput = z.input<typeof updateCategorySchema>;
