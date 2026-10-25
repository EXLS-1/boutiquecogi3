-- Hotfix: add missing columns from the ledger migration that weren't yet applied.
-- Safe to run multiple times (IF NOT EXISTS guards).

-- 1. Add errorCode (the immediate cause of the crash)
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS "errorCode" VARCHAR(128);

-- 2. Add other columns the ledger migration introduced (no-ops if already present)
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS "actorId"       VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
  ADD COLUMN IF NOT EXISTS "actorType"     VARCHAR(32)  NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "impersonatedBy" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "resourceType"  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "resourceId"    VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "traceId"       VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "reason"        TEXT;
