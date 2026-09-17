// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let directory: string;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("EXCHANGE_RATE_CDF", undefined);
  directory = mkdtempSync(join(tmpdir(), "exchange-rate-env-"));
  vi.spyOn(process, "cwd").mockReturnValue(directory);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

it("charge .env.local avant .env pour les seeds", async () => {
  writeFileSync(join(directory, ".env.local"), 'EXCHANGE_RATE_CDF="2375"');
  writeFileSync(join(directory, ".env"), 'EXCHANGE_RATE_CDF="3100"');
  await import("./load-env");
  const { DEFAULT_USD_TO_CDF_RATE } = await import("../../lib/currency/exchange-rate-constants");
  expect(DEFAULT_USD_TO_CDF_RATE).toBe(2375);
});

it("utilise .env en absence de .env.local", async () => {
  writeFileSync(join(directory, ".env"), 'EXCHANGE_RATE_CDF="3100"');
  await import("./load-env");
  expect(process.env.EXCHANGE_RATE_CDF).toBe("3100");
});

it("ne remplace pas une variable fournie par le serveur", async () => {
  vi.stubEnv("EXCHANGE_RATE_CDF", "2500");
  writeFileSync(join(directory, ".env.local"), 'EXCHANGE_RATE_CDF="2375"');
  await import("./load-env");
  expect(process.env.EXCHANGE_RATE_CDF).toBe("2500");
});
