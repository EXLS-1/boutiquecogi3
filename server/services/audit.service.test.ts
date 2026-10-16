import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditSeverity } from "@prisma/client";

const { findUser, createAuditLog } = vi.hoisted(() => ({
  findUser: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser },
    auditLog: { create: createAuditLog },
  },
}));

import { recordAuditLog } from "@/server/services/audit.service";

describe("recordAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUser.mockResolvedValue({ name: "Ada", email: "ada@example.test" });
    createAuditLog.mockImplementation(async ({ data }) => data);
  });

  it("stores signed-in actor snapshots and status", async () => {
    await recordAuditLog({
      action: "server/actions/example.ts#read",
      userId: "actor-1",
      status: "ATTEMPT",
    });

    expect(createAuditLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "server/actions/example.ts#read",
        userId: "actor-1",
        actorName: "Ada",
        actorEmail: "ada@example.test",
        severity: AuditSeverity.INFO,
        status: "ATTEMPT",
      }),
    });
  });

  it("creates anonymous rows and preserves snapshots after actor deletion", async () => {
    await recordAuditLog({
      action: "lib/actions/newsletter.actions.ts#subscribeToNewsletter",
      userId: null,
      status: "ATTEMPT",
    });
    expect(createAuditLog).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        userId: null,
        actorName: null,
        actorEmail: null,
      }),
    });
    expect(findUser).not.toHaveBeenCalled();

    findUser.mockResolvedValueOnce(null);
    await recordAuditLog({
      action: "server/actions/account-self-actions.ts#deleteMyAccountAction",
      userId: "deleted-actor",
      status: "SUCCESS",
      actorSnapshot: { name: "Ada", email: "ada@example.test" },
    });
    expect(createAuditLog).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        userId: null,
        actorName: "Ada",
        actorEmail: "ada@example.test",
      }),
    });
  });
});
