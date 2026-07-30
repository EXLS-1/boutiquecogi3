# TODO: Fix 422 UNPROCESSABLE_ENTITY on Sign-Up

## Task
Fix `POST /api/auth/sign-up/email` returning 422 from `sign-up-form.tsx:114`

## Root Cause
The form uses `authClient.signUp.email()` which sends to `POST /api/auth/sign-up/email` (BetterAuth internal handler). The 422 is caused by Prisma schema incompatibility.

## Plan

### Step 1: Fix `prisma/schema.prisma`
- [x] Change `emailVerified` from `Boolean @default(false)` to `DateTime?` to match BetterAuth's expected schema
- BetterAuth's default User model expects `emailVerified DateTime?`, not `Boolean`

### Step 2: Fix `app/api/auth/sign-up/route.ts`
- [x] Remove `confirmPassword` from Zod schema (client doesn't send it, it's only for client-side validation)
- [x] Fix `headersList` - it's a Promise that needs to be awaited before use
- [x] Update error handling for the new flow

### Step 3: Fix `components/auth/sign-up-form.tsx`
- [x] Replace `authClient.signUp.email()` with direct `fetch()` to `POST /api/auth/sign-up`
- [x] Maintain same UX patterns (loading, error toast, success redirect)
- [x] Handle response properly

### Step 4: Test the fix
- [x] Verify the form submits correctly
- [x] Verify proper error messages are shown

