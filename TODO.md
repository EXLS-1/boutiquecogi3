# TODO — Fix `Property 'role' does not exist on type ...` in `prisma/seed/users.seed.ts`

## Steps

- [x] Analyze the `User` Prisma model (`prisma/schema.prisma`) — confirmed no `role`/`password` fields on `User`.
- [x] Understand RBAC storage: `RoleAssignment.role`, `UserRole`, `Account.password`, `RoleConfig`, `RoleDefinition`.
- [x] Review canonical seed pattern in `scripts/seed-super-admin.ts`.
- [x] Get user approval for the rewrite plan.
- [x] Rewrite `prisma/seed/users.seed.ts` to be schema-compliant:
  - [x] Map app `Role` → Prisma `Role` enum.
  - [x] Ensure `RoleConfig` + `RoleDefinition` exist (defensive).
  - [x] Atomic `$transaction`: User → Account → RoleAssignment → UserRole → UserSecurity → UserPreferences → UserQuota → UserAudit.
  - [x] Return `{ ...user, role: config.role }` so `prisma/seed/index.ts` keeps working.
- [x] Type-check to confirm the error is resolved (`npx tsc --noEmit`). No errors reference `users.seed.ts`; only pre-existing unrelated errors remain in other files.

