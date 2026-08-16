import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("static assets", () => {
  it("exposes a root placeholder.webp asset required by image fallbacks", () => {
    const assetPath = path.join(process.cwd(), "public", "placeholder.webp");

    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.statSync(assetPath).size).toBeGreaterThan(0);
  });
});
