"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { updateUserSchema } from "@/lib/admin/users/users.schemas";
import { updateUser } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function updateUserAction(input: unknown) {
  const actor = await requireUsersPermission(USER_PERMISSION.UPDATE);
  return updateUser(actor, updateUserSchema.parse(input));
}
