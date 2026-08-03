# TODO — Fix BetterAuth API method names

## Context
The sign-up endpoint returns `500 Cannot read properties of undefined (reading 'email')`.
Root cause: `auth.api.signUp` / `auth.api.signIn` do not exist in better-auth v1.6.18.
The `auth.api` object exposes **flat** endpoint keys: `signUpEmail`, `signInEmail`, etc.

## Steps
- [x] Investigate and identify root cause in `app/api/auth/sign-up/route.ts`
- [x] Confirm same bug in `app/api/auth/sign-in/route.ts`
- [x] Fix `app/api/auth/sign-up/route.ts`: `auth.api.signUp.email` → `auth.api.signUpEmail`
- [x] Fix `app/api/auth/sign-in/route.ts`: `auth.api.signIn.email` → `auth.api.signInEmail`
- [ ] Restart dev server and re-test sign-up & sign-in

