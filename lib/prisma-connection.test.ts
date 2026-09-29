// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  describePostgresTarget,
  maskPostgresConnectionString,
  resolvePostgresConnectionString,
} from "./prisma-connection";

/** Pooler « session » (port 5432) — utilisé par l'adaptateur Prisma. */
const DIRECT_URL =
  "postgresql://postgres.cyiwlubjrqyjwgggnqhu:secret@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?schema=public";

/** Pooler « transaction » (port 6543) — repli. */
const DATABASE_URL =
  "postgresql://postgres.cyiwlubjrqyjwgggnqhu:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public";

/** Incident de production : gabarits laissés tels quels → « Invalid URL » d'API Prisma. */
const UNREPLACED_TEMPLATE =
  "postgresql://postgres.cyiwlubjrqyjwgggnqhu:<MOT_DE_PASSE_POSTGRES>@aws-0-<REGION>.pooler.supabase.com:5432/postgres?schema=public";

beforeEach(() => {
  vi.stubEnv("DIRECT_URL", DIRECT_URL);
  vi.stubEnv("DATABASE_URL", DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("résolution de la connexion PostgreSQL", () => {
  it("privilégie DIRECT_URL (pooler session)", () => {
    const resolved = resolvePostgresConnectionString();
    expect(resolved.key).toBe("DIRECT_URL");
    expect(resolved.connectionString).toBe(DIRECT_URL);
    expect(resolved.url.port).toBe("5432");
  });

  it("se replie sur DATABASE_URL quand DIRECT_URL est absente", () => {
    vi.stubEnv("DIRECT_URL", "");
    const resolved = resolvePostgresConnectionString();
    expect(resolved.key).toBe("DATABASE_URL");
    expect(resolved.connectionString).toBe(DATABASE_URL);
  });

  it("normalise les guillemets et espaces parasites", () => {
    vi.stubEnv("DIRECT_URL", `  "${DIRECT_URL}"  `);
    expect(resolvePostgresConnectionString().connectionString).toBe(DIRECT_URL);
  });

  it("refuse une configuration totalement absente", () => {
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("DATABASE_URL", "");
    expect(() => resolvePostgresConnectionString()).toThrow(/DIRECT_URL/);
    expect(() => resolvePostgresConnectionString()).toThrow(/DATABASE_URL/);
  });
});

describe("gabarits non remplacés (cause de l'incident « Invalid URL »)", () => {
  it("reproduit l'échec brut de `pg` (ERR_INVALID_URL)", () => {
    // pg-connection-string analyse via `new URL(str, "postgres://base")`.
    expect(() => new URL(UNREPLACED_TEMPLATE, "postgres://base")).toThrow(/Invalid URL/);
  });

  it("nomme la variable fautive et le gabarit au lieu de « Invalid URL »", () => {
    vi.stubEnv("DIRECT_URL", UNREPLACED_TEMPLATE);
    vi.stubEnv("DATABASE_URL", UNREPLACED_TEMPLATE);

    let message = "";
    try {
      resolvePostgresConnectionString();
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("DIRECT_URL");
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("<MOT_DE_PASSE_POSTGRES>");
    expect(message).toContain("<REGION>");
    expect(message).not.toContain("secret");
  });

  it("valide aussi la variable qui ne sera pas utilisée", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@host:5432/postgres?schema=<SCHEMA>");
    expect(() => resolvePostgresConnectionString()).toThrow(/DATABASE_URL/);
  });
});

describe("contrôles de forme", () => {
  it.each([
    ["postgresql://user:pass@:5432/postgres", /hôte manquant/],
    ["mysql://user:pass@localhost:3306/shop", /protocole/],
    ["postgresql:///shop", /hôte manquant/],
  ])("rejette %s", (value, message) => {
    vi.stubEnv("DIRECT_URL", value);
    vi.stubEnv("DATABASE_URL", value);
    expect(() => resolvePostgresConnectionString()).toThrow(message);
  });

  it("rejette un mot de passe non encodé qui tronquerait la chaîne", () => {
    vi.stubEnv("DIRECT_URL", "postgresql://postgres:pa#ss@localhost:5432/postgres");
    expect(() => resolvePostgresConnectionString()).toThrow(/encodeURIComponent/);
  });

  it("accepte un mot de passe correctement encodé", () => {
    vi.stubEnv("DIRECT_URL", "postgresql://postgres:pa%40ss%23word@localhost:5432/postgres");
    expect(resolvePostgresConnectionString().connectionString).toContain("%40");
  });

  it("n'exige pas d'identifiants (Postgres local sans mot de passe)", () => {
    vi.stubEnv("DIRECT_URL", "postgresql://localhost:5432/postgres?schema=public");
    expect(resolvePostgresConnectionString().url.hostname).toBe("localhost");
  });
});

describe("affichage sans fuite de secret", () => {
  it("masque l'utilisateur et le mot de passe", () => {
    const masked = maskPostgresConnectionString(DIRECT_URL);
    expect(masked).not.toContain("secret");
    expect(masked).toContain("***:***@");
  });

  it("décrit la cible sans identifiants", () => {
    expect(describePostgresTarget(DIRECT_URL)).toBe(
      "aws-0-eu-west-3.pooler.supabase.com:5432/postgres",
    );
  });
});
