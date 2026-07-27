# Fix Plan - Routing & Compilation Issues

## Issues Identified
1. **NavbarShell compilation error** - `cn` import path issue
2. **`/api/auth/get-session` returning 404** - Route conflict or handler issue
3. **`/auth/sign-in` returning 404** - Routing page issue

## Steps
- [ ] 1. Fix `navbar-shell.tsx` import path for `cn`
- [ ] 2. Fix `/api/auth/get-session` route - rename `.tsx` → `.ts` and verify handler
- [ ] 3. Fix `/auth/sign-in` page compilation
- [ ] 4. Test and verify all routes

