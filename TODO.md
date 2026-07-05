# TODO - Connection timeout (Prisma / Next.js)

## Plan recap
1. Identify root cause: Prisma connection timeout during `prisma.product.findMany` from `lib/catalog/catalog-queries.ts`.
2. Inspect Prisma client instantiation and pool config (`lib/prisma.ts`).
3. Fix likely issue: too-aggressive `connectionTimeoutMillis` (2000ms) and maybe missing/incorrect SSL/DIRECT_URL.
4. Add safeguards: environment-driven timeouts, retry, and more conservative pool acquisition.
5. Add a quick runtime health check helper (optional) to validate connectivity.
6. Verify by running `npm run dev` and loading `/`.

## Steps
- [x] Read `lib/catalog/catalog-queries.ts` (error location: `prisma.product.findMany`).
- [x] Read `lib/prisma.ts` (Pool adapter, `DIRECT_URL`, `connectionTimeoutMillis: 2000`).
- [x] Read `README.md`, `PERFORMANCE.md`, `prisma/schema.prisma`, `proxy.ts`, `next.config.ts`, `test-db.ts`.
- [ ] Implement fix in `lib/prisma.ts`:
  - Make `connectionTimeoutMillis` configurable (env) and default higher (e.g. 10000ms).
  - Optionally raise `idleTimeoutMillis` and adjust `max`.
  - Add optional `PGSSLMODE`/SSL env normalization.
  - (If needed) adjust Pool options to be less aggressive for managed Postgres.

- [ ] Update `TODO.md` progress after edits.
- [ ] Run local test: `node test-db.ts` (or `tsx test-db.ts`) then `npm run dev`.
- [ ] Confirm the homepage `/` no longer throws timeout.

