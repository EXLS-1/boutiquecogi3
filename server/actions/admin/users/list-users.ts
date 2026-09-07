"use server";

import { requireUsersPermission } from "@/lib/admin/users/users.authorization";
import { usersQuerySchema } from "@/lib/admin/users/users.schemas";
import { getUsers } from "@/lib/admin/users/users.service";
import { USER_PERMISSION } from "@/lib/admin/users/users.constants";

export async function listUsersAction(input: unknown) {
  await requireUsersPermission(USER_PERMISSION.READ);
  const parsed = usersQuerySchema.parse(input);
  return getUsers(parsed);
}
