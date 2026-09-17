import { withSecurePrisma } from "@/server/core/secure-prisma";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { categoryAssignmentSchema, categoryIdSchema } from "./schemas";
import {
  assertCategoryManagement, categoryTransaction, createCategory,
  deleteCategory, requireCategory, updateCategory, CategoryError,
} from "./repository";
import { normalizeCategoryIds, syncProductCategories } from "@/server/services/product-category-sync";

export const CategoryService = {
  create(input: unknown) {
    return withSecurePrisma(ctx => categoryTransaction(ctx.prisma, tx => createCategory(tx, input)), {
      minRoleLevel: 4, requiredPermissions: [PERMISSIONS["categories:create"]], auditLog: true,
    });
  },
  update(id: string, input: unknown) {
    return withSecurePrisma(ctx => categoryTransaction(ctx.prisma, async tx => {
      assertCategoryManagement(await requireCategory(tx, id), ctx.roleName, ctx.roleLevel);
      return updateCategory(tx, id, input);
    }), { minRoleLevel: 4, requiredPermissions: [PERMISSIONS["categories:update"]], auditLog: true });
  },
  delete(id: string) {
    return withSecurePrisma(ctx => categoryTransaction(ctx.prisma, async tx => {
      assertCategoryManagement(await requireCategory(tx, id), ctx.roleName, ctx.roleLevel);
      return deleteCategory(tx, id);
    }), { minRoleLevel: 4, requiredPermissions: [PERMISSIONS["categories:delete"]], auditLog: true });
  },
  getById(id: string) {
    return withSecurePrisma(ctx => ctx.prisma.category.findUnique({
      where: { id: categoryIdSchema.parse(id), deletedAt: null },
    }), { minRoleLevel: 4, requiredPermissions: [PERMISSIONS["categories:read"]] });
  },
  /** Ajouter conserve la principale ; retirer la principale promeut la suivante. */
  changeProductCategory(input: unknown, operation: "assign" | "remove") {
    return withSecurePrisma(ctx => categoryTransaction(ctx.prisma, async tx => {
      const { productId, categoryId } = categoryAssignmentSchema.parse(input);
      const product = await tx.product.findUnique({
        where: { id: productId, isdeleted: false },
        select: { categoryId: true, categoryProducts: { orderBy: [{ displayOrder: "asc" }, { categoryId: "asc" }], select: { categoryId: true } } },
      });
      if (!product) throw new CategoryError("NOT_FOUND", "Produit introuvable");
      const current = normalizeCategoryIds(product.categoryId, product.categoryProducts.map(c => c.categoryId));
      const ids = operation === "assign"
        ? normalizeCategoryIds(undefined, [...current, categoryId])
        : current.filter(id => id !== categoryId);
      await syncProductCategories(tx, productId, ids);
      return { productId, categoryId, categoryIds: ids };
    }), { minRoleLevel: 4, requiredPermissions: [PERMISSIONS["products:update"]], auditLog: true });
  },
};
