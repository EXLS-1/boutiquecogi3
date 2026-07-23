# Redis TS Error Fix Plan

## Step 1: Fix `lib/redis.ts` — Remove `private` keywords from `redisAdvancedHelpers` object literals
- Add module-level variables (`l1Cache`, `metricsCollector`, `notificationManager`) before `redisAdvancedHelpers`
- Fix the 3 object literal subsections to use module variables instead of `private`/`this.*`

## Step 2: Rewrite `lib/redis.mock.ts` — Replace with proper mock implementation
- Remove all duplicated `redis.ts` content
- Add `createMockRedisClient()` factory function
- Add `createMockLogger()` factory function
- Add `MockRedisClient` class with in-memory storage

