"use server";

import type { Category } from "@prisma/client";
import { CategoryService } from "@/lib/categories/service";
import { categoryFailure, invalidateCategories } from "@/lib/categories/action-helpers";
import { getCategoriesCached, type ActionResponse, type CategoryDTO } from "@/lib/categories/queries";
export type { ActionResponse, CategoryDTO };
export type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/categories/schemas";

export async function getCategories(): Promise<ActionResponse<CategoryDTO[]>> {
  return getCategoriesCached();
}

export async function getCategoryAction(id: string): Promise<ActionResponse<Category | null>> {
  try { return { success: true, data: await CategoryService.getById(id) }; }
  catch (error) { return categoryFailure(error); }
}

export async function createCategoryAction(input: unknown): Promise<ActionResponse<Category>> {
  try {
    const data = await CategoryService.create(input);
    invalidateCategories();
    return { success: true, data };
  } catch (error) { return categoryFailure(error); }
}

export async function updateCategoryAction(id: string, input: unknown): Promise<ActionResponse<Category>> {
  try {
    const data = await CategoryService.update(id, input);
    invalidateCategories();
    return { success: true, data };
  } catch (error) { return categoryFailure(error); }
}

export async function deleteCategoryAction(id: string): Promise<ActionResponse<Category>> {
  try {
    const data = await CategoryService.delete(id);
    invalidateCategories();
    return { success: true, data };
  } catch (error) { return categoryFailure(error); }
}

