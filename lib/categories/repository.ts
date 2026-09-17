import { Prisma } from "@prisma/client";
import type { Category } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from "./schemas";

export class CategoryError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "CategoryError"; }
}

/** Le client doit appartenir à la transaction Serializable de l'appelant. */
export async function requireCategory(tx: Prisma.TransactionClient, id: string) {
  const category = await tx.category.findUnique({ where: { id: categoryIdSchema.parse(id) } });
  if (!category || category.deletedAt) throw new CategoryError("NOT_FOUND", "Catégorie introuvable");
  return category;
}

export async function validateCategoryParent(tx: Prisma.TransactionClient, parentId: string | null, id?: string) {
  const visited = new Set<string>(id ? [id] : []);
  let current = parentId;
  while (current) {
    if (visited.has(current)) throw new CategoryError("CATEGORY_CYCLE", "La hiérarchie ne peut pas contenir de cycle");
    visited.add(current);
    const parent = await requireCategory(tx, current);
    current = parent.parentId;
  }
}

export async function createCategory(tx: Prisma.TransactionClient, input: unknown) {
  const data = createCategorySchema.parse(input);
  if (data.image !== undefined && data.imageUrl !== undefined) {
    throw new CategoryError("VALIDATION_ERROR", "Utilisez image ou imageUrl, pas les deux");
  }
  await validateCategoryParent(tx, data.parentId ?? null);
  return tx.category.create({ data: {
    name: data.name, slug: data.slug ?? slugify(data.name), subtitle: data.subtitle ?? "",
    description: data.description ?? null, image: (data.image ?? data.imageUrl) || null,
    parentId: data.parentId ?? null, displayOrder: data.displayOrder ?? 0,
    OrderBy: data.OrderBy ?? "asc", isNavigable: data.isNavigable ?? true,
    seoTitle: data.seoTitle ?? null, seoDescription: data.seoDescription ?? null,
  } });
}

export async function updateCategory(tx: Prisma.TransactionClient, id: string, input: unknown) {
  const existing = await requireCategory(tx, id);
  const { imageUrl, ...data } = updateCategorySchema.parse(input);
  if (data.parentId !== undefined) await validateCategoryParent(tx, data.parentId, existing.id);
  // Le slug reste stable lors d'un simple renommage.
  return tx.category.update({ where: { id: existing.id }, data: {
    ...data,
    ...(imageUrl !== undefined ? { image: imageUrl || null } : {}),
    ...(data.image !== undefined ? { image: data.image || null } : {}),
  } });
}

export async function deleteCategory(tx: Prisma.TransactionClient, id: string) {
  const existing = await requireCategory(tx, id);
  const [products, associations, children, catalogs] = await Promise.all([
    tx.product.count({ where: { categoryId: existing.id } }),
    tx.categoryProduct.count({ where: { categoryId: existing.id } }),
    tx.category.count({ where: { parentId: existing.id, deletedAt: null } }),
    tx.catalog.count({ where: { categoryId: existing.id } }),
  ]);
  if (products || associations || children || catalogs) {
    throw new CategoryError("CATEGORY_IN_USE", "Retirez les produits, catalogues et sous-catégories avant suppression");
  }
  return tx.category.update({ where: { id: existing.id }, data: { deletedAt: new Date(), isNavigable: false } });
}

export function assertCategoryManagement(category: Category, roleName: string, roleLevel: number) {
  if (roleLevel > category.minRoleLevel ||
      (category.managedByRoles.length > 0 && !category.managedByRoles.includes(roleName))) {
    throw new CategoryError("FORBIDDEN", "Votre rôle ne peut pas gérer cette catégorie");
  }
}

/** Transactions bornées ; nouvelles lectures à chaque tentative concurrente. */
export async function categoryTransaction<T>(
  client: Pick<Prisma.DefaultPrismaClient, "$transaction">,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.$transaction(operation, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && attempt < 2) continue;
        if (error.code === "P2002") throw new CategoryError("CATEGORY_CONFLICT", "Ce nom ou ce slug est déjà utilisé");
        if (error.code === "P2025") throw new CategoryError("NOT_FOUND", "Catégorie introuvable");
        if (error.code === "P2003") throw new CategoryError("CATEGORY_IN_USE", "Une relation empêche cette opération");
        if (error.code === "P2034") throw new CategoryError("CONFLICT", "Modification concurrente, veuillez réessayer");
      }
      throw error;
    }
  }
}
