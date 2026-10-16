ALTER TABLE "audit_log"
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "audit_log"
  DROP CONSTRAINT IF EXISTS "audit_log_userId_fkey";

ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_log_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
