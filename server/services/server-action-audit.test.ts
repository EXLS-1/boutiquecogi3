import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionFromProvider, recordAuditLog } = vi.hoisted(() => ({
  getSessionFromProvider: vi.fn(),
  recordAuditLog: vi.fn(),
}));

vi.mock("@/lib/auth/session-provider", () => ({ getSessionFromProvider }));
vi.mock("@/server/services/audit.service", () => ({ recordAuditLog }));

import { auditServerAction } from "@/server/services/server-action-audit";

describe("auditServerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionFromProvider.mockResolvedValue(null);
    recordAuditLog.mockImplementation(async (entry) =>
      entry.status === "ATTEMPT"
        ? { actorName: "Guest", actorEmail: null }
        : undefined,
    );
  });

  it("records anonymous attempts and outcomes without arguments or result data", async () => {
    const action = auditServerAction(
      "lib/actions/example.ts#subscribe",
      async (password: string) => ({ success: true, password }),
    );

    await expect(action("private-input")).resolves.toEqual({
      success: true,
      password: "private-input",
    });
    expect(recordAuditLog).toHaveBeenNthCalledWith(1, {
      action: "lib/actions/example.ts#subscribe",
      userId: null,
      status: "ATTEMPT",
    });
    expect(recordAuditLog).toHaveBeenNthCalledWith(2, {
      action: "lib/actions/example.ts#subscribe",
      userId: null,
      status: "SUCCESS",
      actorSnapshot: { name: "Guest", email: null },
    });
  });

  it("captures the signed-in actor snapshot before self-deletion", async () => {
    getSessionFromProvider.mockResolvedValue({ user: { id: "actor-1" } });
    recordAuditLog.mockResolvedValueOnce({
      actorName: "Ada",
      actorEmail: "ada@example.test",
    });
    const action = auditServerAction(
      "server/actions/account-self-actions.ts#deleteMyAccountAction",
      async () => ({ success: true }),
    );

    await expect(action()).resolves.toEqual({ success: true });
    expect(recordAuditLog).toHaveBeenNthCalledWith(2, {
      action: "server/actions/account-self-actions.ts#deleteMyAccountAction",
      userId: "actor-1",
      status: "SUCCESS",
      actorSnapshot: { name: "Ada", email: "ada@example.test" },
    });
  });

  it("records returned failures and thrown errors while preserving behavior", async () => {
    const failedResult = auditServerAction(
      "server/actions/example.ts#returnedFailure",
      async () => ({ success: false, error: "private detail" }),
    );
    await expect(failedResult()).resolves.toEqual({
      success: false,
      error: "private detail",
    });
    expect(recordAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "FAILURE" }),
    );

    const failure = new Error("business failure");
    const thrownAction = auditServerAction(
      "server/actions/example.ts#throws",
      async () => {
        throw failure;
      },
    );
    await expect(thrownAction()).rejects.toBe(failure);
    expect(recordAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "FAILURE" }),
    );
  });

  it("does not let audit write failures block the business action", async () => {
    recordAuditLog.mockRejectedValue(new Error("database unavailable"));
    const action = auditServerAction(
      "server/actions/example.ts#resilient",
      async () => "result",
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(action()).resolves.toBe("result");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
