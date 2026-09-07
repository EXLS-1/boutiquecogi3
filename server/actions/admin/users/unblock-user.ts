"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { unblockUserSchema } from "@/lib/admin/users/users.schemas";
import { unblockUser } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function unblockUserAction(input: unknown) {
  const actor = await requireUsersPermission(USER_PERMISSION.BLOCK);
  return unblockUser(actor, unblockUserSchema.parse(input));
}
