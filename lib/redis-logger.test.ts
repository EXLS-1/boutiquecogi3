// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createRedisLogger } from "./redis-logger";

function createSink() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("createRedisLogger", () => {
  it.each(["debug", "info", "warn"] as const)("adapte %s au contexte structuré", (level) => {
    const sink = createSink();
    const logger = createRedisLogger(sink);
    logger[level]("Connexion", { host: "localhost", source: "untrusted" });
    expect(sink[level]).toHaveBeenCalledWith("Connexion", {
      source: "redis", meta: { host: "localhost", source: "untrusted" },
    });
  });

  it("préserve les bindings imbriqués sans modifier le parent ou les entrées", () => {
    const sink = createSink();
    const bindings = { component: "RedisClient", region: "local" };
    const parent = createRedisLogger(sink, bindings);
    const child = parent.child({ component: "RedisStreamManager" }).child({ operation: "read" });
    child.info("Lecture", { region: "remote" });
    parent.info("Connexion");
    expect(sink.info.mock.calls).toEqual([
      ["Lecture", { source: "redis", meta: { component: "RedisStreamManager", region: "remote", operation: "read" } }],
      ["Connexion", { source: "redis", meta: { component: "RedisClient", region: "local" } }],
    ]);
    expect(bindings).toEqual({ component: "RedisClient", region: "local" });
  });

  it.each([new Error("Connexion refusée"), "Connexion refusée"])("sépare l'erreur de ses métadonnées (%s)", (error) => {
    const sink = createSink();
    const meta = { error, operation: "get", stack: "original stack" };
    createRedisLogger(sink).error("Échec Redis", meta);
    expect(sink.error).toHaveBeenCalledWith("Échec Redis", error, {
      source: "redis", meta,
    });
  });

  it("ne transforme pas de simples métadonnées en erreur", () => {
    const sink = createSink();
    const logger = createRedisLogger(sink);
    logger.error("Circuit ouvert", { operation: "get" });
    logger.error("Erreur sans détails");
    expect(sink.error.mock.calls).toEqual([
      ["Circuit ouvert", undefined, { source: "redis", meta: { operation: "get" } }],
      ["Erreur sans détails", undefined, { source: "redis", meta: {} }],
    ]);
  });
});
