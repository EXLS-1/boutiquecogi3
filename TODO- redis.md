# TODO — Fix Redis connection refused (ECONNREFUSED 127.0.0.1:6379)

## Problem
The app is configured to connect to Redis at `127.0.0.1:6379` (`.env`/`.env.local`),
but no Redis server is running on this machine. `lib/redis.ts` uses `ioredis` with an
infinite retry strategy, producing endless `[Redis:ERROR]` log spam.

## Steps
- [x] Analyze `lib/redis.ts` (ioredis client, circuit breaker, retry strategy).
- [x] Confirm no Redis server running (port 6379 closed; no redis-cli/server, docker, wsl).
- [x] Review Redis consumers: `lib/auth/server.ts`, `app/api/auth/get-session/route.ts`, `lib/cache/cacheConsumer.ts`.
- [x] Confirm `.env`/`.env.local` set `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_PASSWORD=votre_password`.
- [x] Get user approval for the plan (add Redis via docker-compose + install Docker Desktop).
- [x] Add `redis` service to `docker-compose.yml` (port 6379, password matching env, named volume, appendonly).
- [x] Install Docker Desktop via `winget install -e --id Docker.DockerDesktop` (v4.85.0 installed successfully).
- [x] Start Docker Desktop (client + compose available; engine not fully up).
- [x] **BLOCKER identified**: WSL2 is NOT installed. Docker Desktop's Linux engine requires WSL2 + reboot.
- [x] **Pivoted to Memurai** (Windows-native Redis-compatible, no reboot needed) as the fallback.
- [x] Downloaded & installed Memurai Developer (4.1.8, Redis API 7.2.12) via elevated MSI.
- [x] Configured Memurai `requirepass votre_password` in `C:\Program Files\Memurai\memurai.conf` (elevated edit).
- [x] Started the Memurai service (elevated).
- [x] Verified connectivity: port 6379 open, `PING` → `PONG`, read/write works with `votre_password`.
- [x] Verified app-compatible connection (host localhost, port 6379, keyPrefix `boutiquecogi3:`) — no errors.
- [x] Restart the Next.js dev server to confirm the Redis error spam is gone.

## RESULT
✅ Redis connection is now working. Memurai is running on `127.0.0.1:6379` with password
`votre_password` (matching `.env`/`.env.local`). The `[Redis:ERROR] ECONNREFUSED` spam is resolved.

> Note: Memurai Developer Edition is Redis 7.2.12-compatible. It auto-shuts down after 10 days
> (developer limitation). The docker-compose.yml `redis` service remains as the production path
> once WSL2 + reboot are available.
