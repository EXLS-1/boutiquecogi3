// prisma/seed/logger.ts
// ============================================
// LOGGER STRUCTURÉ — timers, formatage, niveaux
// ============================================
// Produit un journal clair de type :
//   ✓ SystemConfig
//   ✓ Permissions
//   ✓ Categories
//   Finished in 8.24 s
// Supporte --verbose pour le debug détaillé.

type Level = "info" | "warn" | "error" | "debug" | "success";

export class SeedLogger {
  private verbose: boolean;
  private timers = new Map<string, number>();

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  setVerbose(v: boolean): void {
    this.verbose = v;
  }

  private write(level: Level, msg: string): void {
    const prefix = {
      info: "ℹ",
      warn: "⚠",
      error: "✗",
      debug: "🔍",
      success: "✓",
    }[level];
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${msg}`);
  }

  info(msg: string): void {
    this.write("info", msg);
  }

  warn(msg: string): void {
    this.write("warn", msg);
  }

  error(msg: string, err?: unknown): void {
    this.write("error", msg);
    if (err && this.verbose) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  debug(msg: string): void {
    if (this.verbose) this.write("debug", msg);
  }

  /** Marque le début d'un seed avec son nom. */
  start(name: string): void {
    this.timers.set(name, performance.now());
    this.info(`▶ ${name}...`);
  }

  /** Marque la fin d'un seed et affiche le temps écoulé. */
  end(name: string): void {
    const start = this.timers.get(name);
    const ms = start ? (performance.now() - start).toFixed(1) : "?";
    this.write("success", `${name} (${ms} ms)`);
    this.timers.delete(name);
  }

  /** Affiche une barre de séparation. */
  section(title: string): void {
    const line = "═".repeat(60);
    // eslint-disable-next-line no-console
    console.log(`\n${line}\n${title}\n${line}`);
  }

  /** Résumé final avec la durée totale. */
  success(msg: string): void {
    this.write("success", msg);
  }
}
