"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { deleteUserSchema } from "@/lib/admin/users/users.schemas";
import { deleteUser } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function deleteUserAction(input: unknown) {
  const actor = await requireUsersPermission(USER_PERMISSION.DELETE);
  return deleteUser(actor, deleteUserSchema.parse(input));
}
