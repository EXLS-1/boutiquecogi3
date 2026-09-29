// lib/prisma-connection.ts

/**
 * Résolution et validation de la chaîne de connexion PostgreSQL.
 *
 * POURQUOI CE MODULE
 * ------------------
 * `pg` analyse la chaîne avec `new URL(value, "postgres://base")` (cf.
 * node_modules/pg-connection-string/index.js). Un gabarit de documentation laissé
 * tel quel — ex. `aws-0-<REGION>.pooler.supabase.com` — contient `<` et `>`,
 * caractères interdits dans un hôte : Node lève alors `ERR_INVALID_URL` avec le
 * seul message « Invalid URL ». Prisma emballe cette erreur dans un
 * `PrismaClientKnownRequestError` qui ne nomme JAMAIS la variable fautive :
 *
 *     Invalid `prisma.product.findMany()` invocation ... Invalid URL
 *
 * Ce module remplace ce diagnostic opaque par une erreur explicite, levée AVANT la
 * création du pool (échec au démarrage plutôt qu'à la première requête).
 *
 * PRÉCÉDENCE : DIRECT_URL (pooler « session », port 5432) puis DATABASE_URL
 * (pooler « transaction », port 6543) — identique à l'implémentation d'origine.
 */

/** Variables reconnues, dans l'ordre de priorité (la 1re définie valide gagne). */
export const POSTGRES_CONNECTION_ENV_KEYS = ["DIRECT_URL", "DATABASE_URL"] as const;

export type PostgresConnectionEnvKey = (typeof POSTGRES_CONNECTION_ENV_KEYS)[number];

/** Gabarits de documentation non remplacés : `<REGION>`, `<MOT_DE_PASSE_POSTGRES>`… */
const PLACEHOLDER_PATTERN = /<[^<>]*>/g;

const SUPPORTED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/** Caractères réservés d'une URL qui DOIVENT être encodés : ils coupent l'autorité. */
const UNSAFE_USERINFO_CHARS = /[/?#]/;

export type ResolvedPostgresConnection = {
  /** Variable réellement utilisée (`DIRECT_URL` en priorité). */
  key: PostgresConnectionEnvKey;
  /** Chaîne normalisée transmise à `pg` (sans guillemets ni espaces parasites). */
  connectionString: string;
  /** URL analysée (`hostname`, `port`, `pathname`…). */
  url: URL;
};

/** Lit une variable d'environnement en normalisant guillemets et espaces parasites. */
function readConnectionEnv(key: PostgresConnectionEnvKey): string | null {
  const raw = process.env[key];

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }

  const isQuoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  const value = (isQuoted ? trimmed.slice(1, -1) : trimmed).trim();

  return value === "" ? null : value;
}

/** Masque le couple utilisateur/mot de passe avant tout affichage ou journalisation. */
export function maskPostgresConnectionString(connectionString: string): string {
  return connectionString.replace(/(:\/\/)[^@]*@/, "$1***:***@");
}

/** Cible lisible sans identifiants : `hote:port/base`. */
export function describePostgresTarget(connectionString: string): string {
  const { hostname, port, pathname } = new URL(connectionString, "postgres://base");
  return `${hostname}:${port || "5432"}${pathname}`;
}

/** Liste les motifs de rejet d'une chaîne, avec le correctif attendu. */
function collectConnectionProblems(value: string): string[] {
  const problems: string[] = [];

  const placeholders = value.match(PLACEHOLDER_PATTERN);
  if (placeholders) {
    problems.push(
      `gabarit(s) non remplacé(s) : ${placeholders.join(", ")} — recopiez la vraie valeur du dashboard PostgreSQL (Supabase : Project Settings → Database → Connection string).`,
    );
  }

  // Autorité = segment compris entre « // » et le premier « / », « ? » ou « # ».
  // Elle est analysée « à la main » : ce contrôle doit rester fiable même quand
  // `new URL()` refuse la chaîne (cas d'un hôte vide, ex. postgresql://u:p@:5432/db).
  const authorityStart = value.indexOf("//");
  const authority =
    authorityStart === -1
      ? ""
      : value.slice(authorityStart + 2).split(/[/?#]/, 1)[0];
  const userinfoEnd = authority.lastIndexOf("@");
  const host = userinfoEnd === -1 ? authority : authority.slice(userinfoEnd + 1);

  if (host === "" || host.startsWith(":")) {
    problems.push(
      "hôte manquant — renseignez celui du pooler, ex. aws-0-eu-west-3.pooler.supabase.com.",
    );
  }

  let url: URL | null = null;
  try {
    // Analyse identique à celle de `pg-connection-string` : toute chaîne rejetée ici
    // ferait échouer la connexion sur un `ERR_INVALID_URL` à la première requête.
    url = new URL(value, "postgres://base");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "URL invalide";
    problems.push(
      `chaîne non analysable (${code}) — forme attendue : postgresql://utilisateur:mot_de_passe@hote:port/base.`,
    );

    // Un « / », « ? » ou « # » brut dans les identifiants clôt l'autorité : le mot de
    // passe est tronqué et l'hôte se décale (connexion refusée sans cause apparente).
    const rawChar = value
      .slice(authorityStart + 2, value.lastIndexOf("@"))
      .match(UNSAFE_USERINFO_CHARS);

    if (rawChar) {
      problems.push(
        `caractère « ${rawChar[0]} » non encodé dans les identifiants — encodez-le (encodeURIComponent), ex. « # » → « %23 ».`,
      );
    }
  }

  if (url && !SUPPORTED_PROTOCOLS.has(url.protocol)) {
    problems.push(
      `protocole « ${url.protocol} » non supporté — attendu postgresql:// (ou postgres://).`,
    );
  }

  return problems;
}

/**
 * Retourne la chaîne de connexion utilisable par `pg` / `@prisma/adapter-pg`.
 *
 * @throws Error explicite dès la 1re anomalie détectée (variable absente, gabarit
 *   non remplacé, chaîne non analysable, protocole ou hôte invalides…).
 */
export function resolvePostgresConnectionString(): ResolvedPostgresConnection {
  const candidates = POSTGRES_CONNECTION_ENV_KEYS.map((key) => ({
    key,
    value: readConnectionEnv(key),
  })).filter(
    (candidate): candidate is { key: PostgresConnectionEnvKey; value: string } =>
      candidate.value !== null,
  );

  if (candidates.length === 0) {
    throw new Error(
      "Connexion PostgreSQL non configurée : définissez DIRECT_URL (pooler « session », port 5432) et DATABASE_URL (pooler « transaction », port 6543) dans .env.local ou .env.",
    );
  }

  // Toutes les variables fournies sont validées, y compris celles qui ne seront pas
  // utilisées : `prisma.config.ts` et la CLI Prisma s'appuient aussi sur DATABASE_URL,
  // un gabarit oublié dans la variable « secondaire » doit donc être signalé aussitôt.
  const failures = candidates
    .map((candidate) => ({
      ...candidate,
      problems: collectConnectionProblems(candidate.value),
    }))
    .filter((candidate) => candidate.problems.length > 0);

  if (failures.length > 0) {
    throw new Error(
      [
        "Configuration PostgreSQL invalide (aucune requête n'a été envoyée à la base).",
        ...failures.map(({ key, value, problems }) =>
          [
            `  • ${key} = ${maskPostgresConnectionString(value)}`,
            ...problems.map((problem) => `      - ${problem}`),
          ].join("\n"),
        ),
        "Corrigez .env.local puis relancez le serveur — `npm run db:check` re-teste la connexion sans démarrer Next.js.",
      ].join("\n"),
    );
  }

  const { key, value: connectionString } = candidates[0];

  return { key, connectionString, url: new URL(connectionString, "postgres://base") };
}
