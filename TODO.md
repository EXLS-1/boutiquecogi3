# TODO — Fix "User not found" (401) on Sign-In

## ✅ Step A: Fix & Run Super Admin Seed Script
- [x] Fix `emailVerified: true` → `emailVerified: now` in `scripts/seed-super-admin.ts`
- [ ] Run `npx tsx scripts/seed-super-admin.ts`
- [ ] Verify user + account exist in DB

## ✅ Step B: Fix Full `prisma/seed.ts` Pipeline
- [ ] Create `lib/uuid.ts` shim (`export { generateUUIDv7 } from "@/lib/utils/uuid"`)
- [ ] Rewrite `prisma/seed/users.seed.ts` (remove `password`/`role` from User, create Account + link RoleConfig)
- [ ] Verify `npm run db:seed` works (optional)

## ✅ Step C: Redirect to Sign-Up on 401 "User not found"
- [ ] Read sign-in page component
- [ ] Modify to detect 401/UserNotFound → redirect to `/auth/sign-up`

## ✅ Cleanup
- [ ] Remove temp diagnostic scripts (`_diagnose-auth.ts`, `_env-check.ts`)
