# TODO — Fix TS2339 on session.user.role in app/api/exchange-rate/route.ts

- [x] Analyze root cause (User is a type alias, not an interface; augmentation can't merge)
- [x] Fix `app/api/exchange-rate/route.ts` to safely resolve role via `normalizeRole()`
- [x] Neutralize ineffective/conflicting module augmentation in `types/auth.d.ts` and `types/better-auth.d.ts`
- [x] Verify: targeted `tsc --noEmit` on the route reports no `exchange-rate`/`auth.d.ts`/`better-auth.d.ts` errors.
      (Full-project `tsc` shows pre-existing unrelated syntax errors in `prisma/seed/**`, `scripts/cleanup-2fa-challenges.ts`, `server/services/deleted-account-registry-service.ts`, `lib/redis.mock.ts` — none caused by this change.)
