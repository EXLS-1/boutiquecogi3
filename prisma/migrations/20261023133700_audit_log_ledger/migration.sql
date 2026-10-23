BEGIN;

CREATE OR REPLACE FUNCTION public.audit_redact_jsonb(value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE jsonb_typeof(value)
    WHEN 'object' THEN (
      SELECT COALESCE(
        jsonb_object_agg(
          key,
          CASE
            WHEN key ~* '(password|passphrase|secret|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|cookie|credit[_-]?card|card[_-]?number|cvv|cvc|ssn|email|phone|address|birth|medical|health|iban|bank)'
              THEN '"[REDACTED]"'::jsonb
            ELSE public.audit_redact_jsonb(item)
          END
        ),
        '{}'::jsonb
      )
      FROM jsonb_each(value) AS fields(key, item)
    )
    WHEN 'array' THEN (
      SELECT COALESCE(
        jsonb_agg(public.audit_redact_jsonb(item)),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(value) AS items(item)
    )
    ELSE value
  END
$$;

CREATE OR REPLACE FUNCTION public.audit_redact_text(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN public.audit_redact_jsonb(value::JSONB)::TEXT;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN regexp_replace(
      value,
      '((password|passphrase|secret|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|cookie|credit[_-]?card|card[_-]?number|cvv|cvc|ssn|email|phone|address|birth|medical|health|iban|bank)[[:space:]]*["'']?[=:][[:space:]]*["'']?)[^,[:space:]"''&}]+',
      E'\\1[REDACTED]',
      'gi'
    );
  END;
END
$$;

ALTER TABLE public.audit_log RENAME TO audit_log_before_partitioning;

CREATE TABLE public.audit_log (
  LIKE public.audit_log_before_partitioning INCLUDING DEFAULTS
) PARTITION BY RANGE ("createdAt");

ALTER TABLE public.audit_log
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6)
    USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6)
    USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.audit_log
  ADD COLUMN "actorId" VARCHAR(64) NOT NULL DEFAULT 'anonymous',
  ADD COLUMN "actorType" VARCHAR(32) NOT NULL DEFAULT 'user',
  ADD COLUMN "impersonatedBy" VARCHAR(64),
  ADD COLUMN "resourceType" VARCHAR(64),
  ADD COLUMN "resourceId" VARCHAR(128),
  ADD COLUMN "traceId" VARCHAR(128),
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "errorCode" VARCHAR(128),
  ADD CONSTRAINT audit_log_pkey PRIMARY KEY ("id", "createdAt");

DO $$
DECLARE
  first_month TIMESTAMP WITHOUT TIME ZONE;
  last_month TIMESTAMP WITHOUT TIME ZONE;
  partition_month TIMESTAMP WITHOUT TIME ZONE;
  partition_name TEXT;
BEGIN
  SELECT date_trunc('month', MIN("createdAt"))
    INTO first_month
    FROM public.audit_log_before_partitioning;

  SELECT date_trunc('month', MAX("createdAt"))
    INTO last_month
    FROM public.audit_log_before_partitioning;

  first_month := COALESCE(
    first_month,
    date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  );
  last_month := GREATEST(
    COALESCE(last_month, first_month),
    date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '12 months'
  );

  FOR partition_month IN
    SELECT generate_series(first_month, last_month, INTERVAL '1 month')
  LOOP
    partition_name := 'audit_log_' || to_char(partition_month, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      partition_month AT TIME ZONE 'UTC',
      (partition_month + INTERVAL '1 month') AT TIME ZONE 'UTC'
    );
  END LOOP;
END $$;

INSERT INTO public.audit_log (
  "id", "userId", "roleLevel", "action", "targetId", "targetType",
  "actorName", "actorEmail", "severity", "entity", "entityType", "entityId",
  "newValue", "oldValue", "metadata", "ip", "details", "ipAddress",
  "userAgent", "location", "browser", "os", "device", "referrer",
  "screenRes", "duration", "status", "error", "payload", "response",
  "context", "sessionId", "createdAt", "updatedAt", "actorId", "actorType",
  "resourceType", "resourceId"
)
SELECT
  "id", "userId", "roleLevel", "action", "targetId", "targetType",
  "actorName", "actorEmail", "severity", "entity", "entityType", "entityId",
  public.audit_redact_jsonb("newValue"),
  public.audit_redact_jsonb("oldValue"),
  public.audit_redact_jsonb("metadata"),
  "ip", "details", "ipAddress", "userAgent", "location", "browser", "os",
  "device", "referrer", "screenRes", "duration", COALESCE("status", 'SUCCESS'),
  "error", public.audit_redact_jsonb("payload"),
  public.audit_redact_jsonb("response"),
  public.audit_redact_jsonb("context"), "sessionId",
  "createdAt" AT TIME ZONE 'UTC', "updatedAt" AT TIME ZONE 'UTC',
  COALESCE("userId"::TEXT, 'anonymous'),
  CASE WHEN "userId" IS NULL THEN 'anonymous' ELSE 'user' END,
  COALESCE("targetType", "entityType", "entity"),
  COALESCE("targetId"::TEXT, "entityId")
FROM public.audit_log_before_partitioning;

DO $$
DECLARE
  existing_grant RECORD;
BEGIN
  FOR existing_grant IN
    SELECT DISTINCT
      roles.rolname,
      privileges.privilege_type
    FROM pg_class AS old_table
    CROSS JOIN LATERAL aclexplode(old_table.relacl) AS privileges
    JOIN pg_roles AS roles ON roles.oid = privileges.grantee
    WHERE old_table.oid = 'public.audit_log_before_partitioning'::REGCLASS
      AND privileges.privilege_type IN ('SELECT', 'INSERT')
  LOOP
    EXECUTE format(
      'GRANT %s ON public.audit_log TO %I',
      existing_grant.privilege_type,
      existing_grant.rolname
    );
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.ensure_audit_log_partitions(INTEGER);

CREATE INDEX audit_log_user_id_idx ON public.audit_log ("userId");
CREATE INDEX audit_log_action_idx ON public.audit_log ("action");
CREATE INDEX audit_log_entity_idx ON public.audit_log ("entity");
CREATE INDEX audit_log_created_at_idx ON public.audit_log ("createdAt");
CREATE INDEX audit_log_target_idx ON public.audit_log ("targetId", "targetType");
CREATE INDEX audit_log_severity_idx ON public.audit_log ("severity");
CREATE INDEX audit_log_actor_time_idx
  ON public.audit_log ("actorId", "createdAt" DESC);
CREATE INDEX audit_log_action_time_idx
  ON public.audit_log ("action", "createdAt" DESC);
CREATE INDEX audit_log_resource_time_idx
  ON public.audit_log ("resourceType", "resourceId", "createdAt" DESC);
CREATE INDEX audit_log_metadata_gin_idx
  ON public.audit_log USING GIN ("metadata" jsonb_path_ops);

CREATE TABLE public.audit_outbox (
  "id" UUID PRIMARY KEY,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMPTZ(6),
  "processedAt" TIMESTAMPTZ(6),
  "failedAt" TIMESTAMPTZ(6),
  "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_outbox_pending_idx
  ON public.audit_outbox ("nextAttemptAt", "createdAt")
  WHERE "processedAt" IS NULL AND "failedAt" IS NULL;

DO $$
DECLARE
  application_role RECORD;
BEGIN
  FOR application_role IN
    SELECT DISTINCT roles.rolname
    FROM pg_class AS old_table
    CROSS JOIN LATERAL aclexplode(old_table.relacl) AS privileges
    JOIN pg_roles AS roles ON roles.oid = privileges.grantee
    WHERE old_table.oid = 'public.audit_log_before_partitioning'::REGCLASS
      AND privileges.privilege_type IN ('SELECT', 'INSERT')
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE ON public.audit_outbox TO %I',
      application_role.rolname
    );
  END LOOP;
END $$;

DROP TABLE public.audit_log_before_partitioning;

CREATE OR REPLACE FUNCTION public.audit_log_prepare_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."actorId" := COALESCE(
    NULLIF(NEW."actorId", 'anonymous'),
    NEW."userId"::TEXT,
    'anonymous'
  );
  IF NEW."actorId" = 'anonymous' AND NEW."actorType" = 'user' THEN
    NEW."actorType" := 'anonymous';
  END IF;
  NEW."resourceType" := COALESCE(
    NEW."resourceType",
    NEW."targetType",
    NEW."entityType",
    NEW."entity"
  );
  NEW."resourceId" := COALESCE(
    NEW."resourceId",
    NEW."targetId"::TEXT,
    NEW."entityId"
  );
  NEW."status" := COALESCE(NEW."status", 'SUCCESS');
  NEW."newValue" := public.audit_redact_jsonb(NEW."newValue");
  NEW."oldValue" := public.audit_redact_jsonb(NEW."oldValue");
  NEW."metadata" := public.audit_redact_jsonb(NEW."metadata");
  NEW."payload" := public.audit_redact_jsonb(NEW."payload");
  NEW."response" := public.audit_redact_jsonb(NEW."response");
  NEW."context" := public.audit_redact_jsonb(NEW."context");
  NEW."details" := public.audit_redact_text(NEW."details");
  NEW."error" := public.audit_redact_text(NEW."error");
  NEW."reason" := public.audit_redact_text(NEW."reason");
  RETURN NEW;
END
$$;

CREATE TRIGGER audit_log_prepare_insert
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_prepare_insert();

CREATE OR REPLACE FUNCTION public.audit_log_reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only; % is prohibited', TG_OP
    USING ERRCODE = '55000';
END
$$;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.audit_log_reject_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ensure_audit_log_partitions(months_ahead INTEGER DEFAULT 3)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_month TIMESTAMP WITHOUT TIME ZONE;
  partition_month TIMESTAMP WITHOUT TIME ZONE;
  partition_name TEXT;
BEGIN
  IF months_ahead < 0 OR months_ahead > 12 THEN
    RAISE EXCEPTION 'months_ahead must be between 0 and 12';
  END IF;

  current_month := date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
  FOR partition_month IN
    SELECT generate_series(
      current_month,
      current_month + make_interval(months => months_ahead),
      INTERVAL '1 month'
    )
  LOOP
    partition_name := 'audit_log_' || to_char(partition_month, 'YYYY_MM');
    IF to_regclass(format('public.%I', partition_name)) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        partition_month AT TIME ZONE 'UTC',
        (partition_month + INTERVAL '1 month') AT TIME ZONE 'UTC'
      );
    END IF;
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.ensure_audit_log_partitions(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_audit_log_partitions(INTEGER) TO CURRENT_USER;

COMMIT;
