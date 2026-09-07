"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { changeUserRoleSchema } from "@/lib/admin/users/users.schemas";
import { changeUserRole } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function changeUserRoleAction(input: unknown) {
  const actor = await requireUsersPermission(USER_PERMISSION.ROLE);
  return changeUserRole(actor, changeUserRoleSchema.parse(input));
}
