"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { blockUserSchema } from "@/lib/admin/users/users.schemas";
import { blockUser } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function blockUserAction(input: unknown) {
  const actor = await requireUsersPermission(USER_PERMISSION.BLOCK);
  return blockUser(actor, blockUserSchema.parse(input));
}
