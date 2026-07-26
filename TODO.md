# TODO: Corrective Refactoring — Redis Client

## ✅ Step 1: Fix `lib/redis.ts` — DONE
- [x] 1.1 Add `import crypto from "node:crypto";` at top
- [x] 1.2 Fix `RedisClusterConfigSchema` syntax (`= z.object({`)
- [x] 1.3 Fix HMR Singleton: replace `let globalRedisClient` with `globalThis` pattern
- [x] 1.4 Fix `CircuitBreaker.recordSuccess()`: add `this.lastFailureTime = null;`

## Step 2: Refactor `lib/redis.mock.ts`
- [ ] Replace real `ioredis` imports with proper in-memory mock
- [ ] Add `createMockRedisClient()` and `createMockLogger()` functions

## Step 3: Update `lib/redis.test.ts`
- [ ] Adjust imports if needed after mock refactor

## Step 4: Verify
- [ ] Run TypeScript compiler check
- [ ] Run tests

