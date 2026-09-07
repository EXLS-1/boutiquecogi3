"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { getUserDetails } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function getUserAction(userId: string) {
  const actor = await requireUsersPermission(USER_PERMISSION.READ);
  return getUserDetails(actor, userId);
}
