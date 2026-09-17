// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getConfiguredExchangeRate } from "./exchange-rate-env";

vi.mock("./exchange-rate-cache", () => ({
  getLastValidRate: vi.fn(),
  saveLastValidRate: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("EXCHANGE_RATE_CDF", "2350");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("taux configuré USD/CDF", () => {
  it.each(["2350", " 2375.50 ", "3100"])("accepte %s", (value) => {
    vi.stubEnv("EXCHANGE_RATE_CDF", value);
    expect(getConfiguredExchangeRate()).toBe(Number(value));
  });

  it.each([undefined, "", " ", "0", "-1", "NaN", "Infinity", "2350abc", "2,350", "0x100", "9".repeat(400)])(
    "refuse une configuration invalide : %s",
    (value) => {
      vi.stubEnv("EXCHANGE_RATE_CDF", value);
      expect(() => getConfiguredExchangeRate()).toThrow("EXCHANGE_RATE_CDF");
    },
  );

  it.each([2350, 2375.5, 3100])("partage le taux %s entre conversions et seeds", async (rate) => {
    vi.stubEnv("EXCHANGE_RATE_CDF", String(rate));
    vi.stubEnv("FALLBACK_EXCHANGE_RATE", "9999");
    const constants = await import("./exchange-rate-constants");
    const convert = await import("./exchange-rate-convert");
    const seed = await import("../../prisma/seed/utils/currency");
    const shared = await import("../../prisma/seed/shared/currencies");
    expect(constants.DEFAULT_USD_TO_CDF_RATE).toBe(rate);
    expect(constants.FALLBACK_EXCHANGE_RATE).toBe(rate);
    expect(convert.usdToCdf(2)).toBe(Math.round(2 * rate));
    expect(convert.cdfToUsd(rate * 2)).toBe(2);
    expect(convert.bulkUsdToCdf([0, 2])).toEqual([0, Math.round(2 * rate)]);
    expect(seed.SEED_EXCHANGE_RATE_USD_CDF).toBe(rate);
    expect(shared.SEED_EXCHANGE_RATE_USD_CDF).toBe(rate);
    expect(seed.usdCentsToCdf(200)).toBe(Math.round(2 * rate));
    expect(seed.cdfToUsdCents(rate * 2)).toBe(200);
    expect(shared.CURRENCIES.find((c) => c.code === "CDF")?.rateToUsd).toBe(1 / rate);
  });

  it("utilise le taux configuré quand le cache est vide", async () => {
    const cache = await import("./exchange-rate-cache");
    vi.mocked(cache.getLastValidRate).mockResolvedValue(null);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const service = await import("./exchange-rate-service");
    expect((await service.getFastUSDToCDFRate()).toNumber()).toBe(2350);
  });

  it("conserve la priorité du taux en cache", async () => {
    const cache = await import("./exchange-rate-cache");
    vi.mocked(cache.getLastValidRate).mockResolvedValue(new Prisma.Decimal("2375.5"));
    const service = await import("./exchange-rate-service");
    expect((await service.getFastUSDToCDFRate()).toNumber()).toBe(2375.5);
  });

  it("convertit les paiements de cents USD en francs CDF", async () => {
    const { buildPaymentFactory } = await import("../../prisma/seed/factories/payment.factory");
    expect(buildPaymentFactory(1, "order", 200, 42, { currency: "CDF" }).amount).toBe(4700);
    expect(buildPaymentFactory(1, "order", 200, 42, { currency: "USD" }).amount).toBe(200);
  });
});
