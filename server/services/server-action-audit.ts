import { getSessionFromProvider } from "@/components/providers/session-provider";
import { recordAuditLog, AuditSeverity } from "@/server/services/audit.service";

type AsyncAction = (...args: never[]) => Promise<unknown>;

export interface AuditActionOptions<T extends AsyncAction = AsyncAction> {
  severity?: AuditSeverity;
  targetType?: string;
  targetId?: string | ((...args: Parameters<T>) => string | undefined | null);
  details?:
    | Record<string, unknown>
    | ((...args: Parameters<T>) => Record<string, unknown> | undefined);
}

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
): T;
export function auditServerAction<T extends AsyncAction>(
  action: string,
  options: AuditActionOptions<T>,
  run: T,
): T;
export function auditServerAction<T extends AsyncAction>(
  action: string,
  runOrOptions: T | AuditActionOptions<T>,
  maybeRun?: T,
): T {
  const isOptions = typeof runOrOptions === "object" && runOrOptions !== null;
  const options = (isOptions ? runOrOptions : {}) as AuditActionOptions<T>;
  const run = (isOptions ? maybeRun : runOrOptions) as T;

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    let userId: string | null = null;
    try {
      const session = await getSessionFromProvider();
      const id = session?.user?.id;
      userId = typeof id === "string" ? id : null;
    } catch (error) {
      console.error("[SERVER_ACTION_AUDIT_ACTOR_ERROR]", error);
    }

    const resolvedTargetId =
      typeof options.targetId === "function"
        ? (options.targetId(...args) ?? undefined)
        : options.targetId ?? undefined;

    const resolvedDetails =
      typeof options.details === "function"
        ? options.details(...args)
        : options.details;

    const attempt = await safeRecordAuditLog({
      action,
      userId,
      status: "ATTEMPT",
      ...(resolvedTargetId !== undefined && { targetId: resolvedTargetId }),
      ...(options.targetType !== undefined && { targetType: options.targetType }),
      ...(options.severity !== undefined && { severity: options.severity }),
      ...(resolvedDetails !== undefined && { details: resolvedDetails }),
    });

    try {
      const result = await run(...args);
      let outcome = "SUCCESS";
      let errorMsg: string | undefined;

      try {
        if (
          typeof result === "object" &&
          result !== null &&
          "success" in result &&
          result.success === false
        ) {
          outcome = "FAILURE";
          if ("error" in result && typeof result.error === "string") {
            errorMsg = result.error;
          }
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
        ...(resolvedTargetId !== undefined && { targetId: resolvedTargetId }),
        ...(options.targetType !== undefined && { targetType: options.targetType }),
        ...(options.severity !== undefined && { severity: options.severity }),
        ...(resolvedDetails !== undefined && { details: resolvedDetails }),
        ...(errorMsg !== undefined && { error: errorMsg }),
      });
      // `run` est contraint `(...args: never[]) => Promise<unknown>` : le type
      // précis est retrouvé via le générique T — on retourne le résultat tel
      // quel (jamais transformé).
      return result as Awaited<ReturnType<T>>;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erreur inattendue";
      await safeRecordAuditLog({
        action,
        userId,
        status: "FAILURE",
        actorSnapshot: attempt
          ? { name: attempt.actorName, email: attempt.actorEmail }
          : undefined,
        ...(resolvedTargetId !== undefined && { targetId: resolvedTargetId }),
        ...(options.targetType !== undefined && { targetType: options.targetType }),
        ...(options.severity !== undefined && { severity: options.severity }),
        ...(resolvedDetails !== undefined && { details: resolvedDetails }),
        error: errorMsg,
      });
      throw error;
    }
  }) as T;
}

