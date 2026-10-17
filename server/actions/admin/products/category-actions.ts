"use server";

import { CategoryService } from "@/lib/categories/service";
import { categoryFailure, invalidateCategories } from "@/lib/categories/action-helpers";
import { recordServerActionAudit, AuditSeverity } from "@/server/services/audit.service";

export async function assignCategoryAction(input: unknown) {
  try {
    const data = await CategoryService.changeProductCategory(input, "assign");
    invalidateCategories(data.productId);
    await recordServerActionAudit({
      action: "CATEGORY_ASSIGN_PRODUCT",
      targetId: data.productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.INFO,
      details: { productId: data.productId, mode: "assign" },
    });
    return { success: true as const, data };
  } catch (error) {
    const failure = categoryFailure(error);
    if (!failure.success) return { success: false as const, error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.error } };
    throw error;
  }
}

export async function removeCategoryAction(input: unknown) {
  try {
    const data = await CategoryService.changeProductCategory(input, "remove");
    invalidateCategories(data.productId);
    await recordServerActionAudit({
      action: "CATEGORY_REMOVE_PRODUCT",
      targetId: data.productId,
      targetType: "PRODUCT",
      severity: AuditSeverity.WARNING,
      details: { productId: data.productId, mode: "remove" },
    });
    return { success: true as const, data };
  } catch (error) {
    const failure = categoryFailure(error);
    if (!failure.success) return { success: false as const, error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.error } };
    throw error;
  }
}
