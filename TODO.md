# TODO - Fix server/actions/role-actions.ts

## Steps

- [x] 1. Add Zod validation schema for update operation in lib/validations/role.ts
  - Created `updateRoleSchema` with optional fields: description, defaultPermissionCodes, isActive
  - Added `UpdateRoleInput` type export
- [x] 2. Fix error.code TypeScript errors + add Zod validation in updateRoleAction
  - Added `AppError` interface extending Error with optional `code`
  - Created `getErrorCode()` and `getErrorMessage()` helper functions
  - Added `RoleServiceError` import for proper type discrimination
  - Integrated `updateRoleSchema.safeParse()` in `updateRoleAction`
  - Standardized error handling across all 4 actions (create, list, update, delete)
- [x] 3. Update `RoleService.update` signature to use `UpdateRoleInput` type
  - Updated import to include `UpdateRoleInput` type
  - Changed method signature from `Partial<Pick<CreateRoleInput, ...>>` to `UpdateRoleInput`
- [x] 4. Verify changes — all 3 files verified and reviewed

