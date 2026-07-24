# Auth Fix Plan - TODO

## ✅ Step 1: Remove the custom social sign-in route
- Deleted `app/api/auth/sign-in/social/route.ts`
- BetterAuth's built-in `[...auth]` handler now processes `POST /api/auth/sign-in/social` natively
- OAuth redirect flows will work correctly

## ✅ Step 2: Fix `useAuth` hook API method
- Changed `authClient.signIn.credentials()` → `authClient.signIn.email()`
- Changed `authClient.signUp.credentials()` → `authClient.signUp.email()`
- These are the correct method names for BetterAuth 1.6.x

## ✅ Step 3: Deprecate duplicate `lib/auth-client.ts`
- Updated to re-export from canonical source `lib/auth/auth-client.ts`
- Added deprecation notice

## ✅ Step 4: Unify base URL resolution
- Client uses `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_BASE_URL` → `window.location.origin`
- Server uses `BETTER_AUTH_URL` → `NEXT_PUBLIC_BASE_URL` → `http://localhost:3000`
- ❓ Consider if `NEXT_PUBLIC_APP_URL` should be added as a fallback for server too

