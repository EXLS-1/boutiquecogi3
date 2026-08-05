# TODO — Fix TypeScript errors in prisma/seed/treasury.seed.ts

- [x] Analyze task and read relevant files (treasury.seed.ts, rbac.ts)
- [x] Get plan approval from user
- [x] Rewrite prisma/seed/treasury.seed.ts replacing invalid PERMISSIONS aliases:
  - [x] PERMISSIONS.SETTINGS_BILLING → PERMISSIONS["settings:billing"] (6 occurrences)
  - [x] PERMISSIONS.ANALYTICS_READ → PERMISSIONS["analytics:read"] (3 occurrences)
  - [x] PERMISSIONS.ORDERS_READ → PERMISSIONS["orders:read"] (1 occurrence)
  - [x] PERMISSIONS.ORDERS_REFUND → PERMISSIONS["orders:refund"] (1 occurrence)
  - [x] PERMISSIONS.ORDERS_UPDATE → PERMISSIONS["orders:update"] (1 occurrence)
- [x] Verify no remaining PERMISSIONS.<alias> dot-notation references (findstr returned no matches)
- [x] Run TypeScript check to confirm errors are gone (no ts(2551) property errors; only TS2307 path-alias resolution when using --ignoreConfig, which is expected and unrelated)
