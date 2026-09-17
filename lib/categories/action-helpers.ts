import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { AuthorizationError } from "@/server/core/secure-prisma";
import { ProductServiceError } from "@/server/services/product-service-error";
import { CategoryError } from "./repository";
import { CACHE_TAGS } from "@/lib/product-catalog/catalog-constants";
import type { ActionResponse } from "./queries";

export function categoryFailure(error: unknown): ActionResponse<never> {
  if (error instanceof z.ZodError) return { success: false, code: "VALIDATION_ERROR", error: "Données invalides" };
  if (error instanceof CategoryError || error instanceof AuthorizationError || error instanceof ProductServiceError) {
    return { success: false, code: error.code, error: error.message };
  }
  console.error("[categories]", error);
  return { success: false, code: "INTERNAL_ERROR", error: "Impossible de terminer l'opération" };
}

export function invalidateCategories(productId?: string) {
  for (const tag of [...Object.values(CACHE_TAGS), "admin:products:list", "admin:products:kpis"]) {
    revalidateTag(tag, { expire: 0 });
  }
  revalidatePath("/products");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/categories");
  revalidatePath("/dashboard/admin");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}
