"use server";
import { CategoryService } from "@/lib/categories/service";
import { categoryFailure, invalidateCategories } from "@/lib/categories/action-helpers";

export async function assignCategoryAction(input: unknown) {
  try {
    const data = await CategoryService.changeProductCategory(input, "assign");
    invalidateCategories(data.productId);
    return { success: true as const, data };
  } catch (error) {
    const failure = categoryFailure(error);
    if (!failure.success) return { success: false as const, error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.error } };
    throw error;
  }
}
