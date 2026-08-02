# TODO — Fix TypeScript errors in `lib/auth.ts`

## Context
The `hooks.before` / `hooks.after` options in better-auth v1.6.x expect an
`AuthMiddleware` (created via `createAuthMiddleware` from `better-auth/api`).
Raw handlers make TS infer `MiddlewareInputContext`, which lacks `path`/`context`.

## Steps
- [x] Add `import { createAuthMiddleware } from "better-auth/api";` to `lib/auth.ts`
- [x] Wrap `hooks.before` with `createAuthMiddleware(...)` and use `ctx.request` instead of `ctx.context.request`
- [x] Wrap `hooks.after` with `createAuthMiddleware(...)`:
  - [x] Use `ctx.request` / `ctx.request?.headers` for IP + user-agent
  - [x] Replace mistyped `ctx.context.responseHeader` cookie logic with typed `ctx.setCookie(...)`
  - [x] Replace `ctx.context.response` mutation with `ctx.context.returned` (real endpoint body)
- [x] Run `npx tsc --noEmit` to confirm no TS errors

