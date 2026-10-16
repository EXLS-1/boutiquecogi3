import { getSessionFromProvider } from "@/lib/auth/session-provider";
import { recordAuditLog } from "@/server/services/audit.service";

type AsyncAction = (...args: never[]) => Promise<unknown>;

async function safeRecordAuditLog(
  params: Parameters<typeof recordAuditLog>[0],
) {
  try {
    return await recordAuditLog(params);
  } catch (error) {
    console.error("[SERVER_ACTION_AUDIT_WRITE_ERROR]", error);
  }
}

/**
 * Wrap a Server Action without inspecting its arguments or return value.
 * The identifier must be a source-defined constant, never action input.
 */
export function auditServerAction<T extends AsyncAction>(
  action: string,
  run: T,
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    let userId: string | null = null;
    try {
      const session = await getSessionFromProvider();
      const id = session?.user?.id;
      userId = typeof id === "string" ? id : null;
    } catch (error) {
      console.error("[SERVER_ACTION_AUDIT_ACTOR_ERROR]", error);
    }

    const attempt = await safeRecordAuditLog({
      action,
      userId,
      status: "ATTEMPT",
    });

    try {
      const result = await run(...args);
      let outcome = "SUCCESS";
      try {
        if (
          typeof result === "object" &&
          result !== null &&
          "success" in result &&
          result.success === false
        ) {
          outcome = "FAILURE";
        }
      } catch (error) {
        console.error("[SERVER_ACTION_AUDIT_OUTCOME_ERROR]", error);
      }
      await safeRecordAuditLog({
        action,
        userId,
        status: outcome,
        actorSnapshot: attempt
          ? { name: attempt.actorName, email: attempt.actorEmail }
          : undefined,
      });
      return result;
    } catch (error) {
      await safeRecordAuditLog({
        action,
        userId,
        status: "FAILURE",
        actorSnapshot: attempt
          ? { name: attempt.actorName, email: attempt.actorEmail }
          : undefined,
      });
      throw error;
    }
  }) as T;
}
