// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Redis } from "ioredis";
import { RedisClient, RedisStreamManager } from "./redis";

describe("Redis command compatibility", () => {
  let client: RedisClient;
  let raw: Redis;
  let streams: RedisStreamManager;

  beforeEach(() => {
    RedisClient.resetInstance();
    client = RedisClient.getInstance();
    raw = new Redis({ lazyConnect: true });
    Reflect.set(client, "client", raw);
    vi.spyOn(client, "connect").mockResolvedValue();
    streams = new RedisStreamManager(client);
  });

  afterEach(() => {
    raw.disconnect();
    Reflect.set(client, "client", null);
    RedisClient.resetInstance();
    vi.restoreAllMocks();
  });

  it.each([
    [{}, []], [{ nx: true }, ["NX"]], [{ xx: true }, ["XX"]],
    [{ ttlSeconds: 30 }, ["EX", 30]],
    [{ ttlSeconds: 30, nx: true }, ["EX", 30, "NX"]],
    [{ ttlSeconds: 30, xx: true }, ["EX", 30, "XX"]],
    [{ keepTtl: true }, ["KEEPTTL"]],
    [{ keepTtl: true, nx: true }, ["KEEPTTL", "NX"]],
    [{ keepTtl: true, xx: true }, ["KEEPTTL", "XX"]],
  ] as const)("SET respecte les options %j", async (options, args) => {
    const set = vi.spyOn(raw, "set").mockResolvedValue("OK");
    await client.set("key", "value", options);
    expect(set).toHaveBeenCalledWith("key", '"value"', ...args);
  });

  it.each([
    { nx: true, xx: true }, { ttlSeconds: 1, keepTtl: true },
    { ttlSeconds: 0 }, { ttlSeconds: -1 }, { ttlSeconds: 1.5 },
    { ttlSeconds: Number.NaN }, { ttlSeconds: Infinity },
  ])("SET rejette les options invalides %j avant connexion", async (options) => {
    await expect(client.set("key", "value", options)).rejects.toThrow();
    expect(client.connect).not.toHaveBeenCalled();
  });

  it("INFO omet le paramètre absent", async () => {
    const info = vi.spyOn(raw, "info").mockResolvedValue("ok");
    await client.info();
    await client.info("memory");
    expect(info.mock.calls).toEqual([[], ["memory"]]);
  });

  it("MULTI distingue annulation et transaction vide", async () => {
    const pipeline = raw.multi();
    vi.spyOn(raw, "multi").mockReturnValue(pipeline);
    vi.spyOn(pipeline, "exec").mockResolvedValueOnce(null).mockResolvedValueOnce([]);
    await expect(client.multi(() => {})).rejects.toMatchObject({ code: "REDIS_TRANSACTION_ABORTED" });
    await expect(client.multi(() => {})).resolves.toEqual([]);
  });

  it("XGROUP place MKSTREAM après l'identifiant", async () => {
    const command = vi.spyOn(raw, "xgroup").mockResolvedValue("OK");
    await streams.createConsumerGroup("events", "workers");
    await streams.createConsumerGroup("events", "workers", { id: "0", mkStream: true });
    expect(command.mock.calls).toEqual([
      ["CREATE", "events", "workers", "$"],
      ["CREATE", "events", "workers", "0", "MKSTREAM"],
    ]);
  });

  it("XPENDING utilise une plage et respecte le consommateur", async () => {
    const pending = vi.spyOn(raw, "xpending").mockResolvedValue([["1-0", "worker", 100, 2]]);
    expect(await streams.getPending("events", "workers")).toEqual([
      { id: "1-0", consumer: "worker", elapsedMs: 100, deliveries: 2 },
    ]);
    await streams.getPending("events", "workers", { consumer: "worker" });
    expect(pending.mock.calls).toEqual([
      ["events", "workers", "-", "+", 10],
      ["events", "workers", "-", "+", 10, "worker"],
    ]);
  });

  it("XREADGROUP gère null et valide les tuples", async () => {
    const call = vi.spyOn(raw, "call").mockResolvedValueOnce(null)
      .mockResolvedValueOnce([["events", [["1-0", ["kind", "order"]]]]])
      .mockResolvedValueOnce([["events", [["1-0", ["orphan"]]]]]);
    const group = { stream: "events", group: "workers", consumer: "worker" };
    expect(await streams.readGroup(group, { block: 0, noAck: true })).toEqual([]);
    expect(call).toHaveBeenCalledWith("XREADGROUP", "GROUP", "workers", "worker", "COUNT", 10, "BLOCK", 0, "NOACK", "STREAMS", "events", ">");
    expect(await streams.readGroup(group)).toEqual([{ id: "1-0", data: { kind: "order" } }]);
    await expect(streams.readGroup(group)).rejects.toThrow();
  });

  it("XCLAIM valide les paires de champs", async () => {
    vi.spyOn(raw, "xclaim").mockResolvedValueOnce([["1-0", ["kind", "order"]]])
      .mockResolvedValueOnce([["1-0", ["orphan"]]]);
    expect(await streams.claimMessages("events", "workers", "worker", 100, "1-0"))
      .toEqual([{ id: "1-0", data: { kind: "order" } }]);
    await expect(streams.claimMessages("events", "workers", "worker", 100, "1-0")).rejects.toThrow();
  });
});
