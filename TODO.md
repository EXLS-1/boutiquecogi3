# TODO — Fix "Unexpected any" lint errors in admin users API routes

## Steps

- [x] Fix `app/api/admin/users/block/route.ts` — replace `(error as any).code` with type-safe code extraction
- [x] Fix `app/api/admin/users/unblock/route.ts` — replace `(error as any).code` with type-safe code extraction
- [x] Fix `app/api/admin/users/route.ts` — replace `(error as any).code` with type-safe code extraction
- [x] Clean up `block/route.ts` warnings: stray `app` prefix on first line and unused `unblockUserSchema` import
- [x] Verify with ESLint (`npx eslint` on the affected files)

