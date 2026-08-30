// lib/pin/env-file.ts

/**
 * Persistance des variables d'environnement du PIN super-admin dans les fichiers
 * `.env` / `.env.local`.
 *
 * EXIGENCE DE SÉCURITÉ : le code PIN super-admin est CONSERVÉ DANS LE FICHIER .env.
 * Les écritures du SUPER_ADMIN (création/modification du PIN, activation,
 * désactivation) sont donc répercutées sur disque, en plus de la mise à jour
 * immédiate de `process.env` effectuée par l'appelant.
 *
 * Les écritures sont « best-effort » : si le système de fichiers est en
 * lecture seule (déploiement conteneurisé), aucun fichier n'est modifié et
 * l'appelant remonte un avertissement à l'interface SUPER_ADMIN.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/** Fichiers d'environnement cibles (tous synchronisés pour éviter tout conflit de précédence dotenv). */
const ENV_FILES = [".env.local", ".env"] as const;

/**
 * Insère ou remplace `KEY="value"` dans le contenu d'un fichier .env.
 *
 * - Préserve les commentaires et les autres variables.
 * - Ne remplace que la clé EXACTE (`ADMIN_PIN` ne matche pas `ADMIN_PIN_ENABLED`).
 * - Valeur systématiquement entre guillemets doubles : sans cela, `#` tronquerait
 *   la valeur (dotenv) — le jeu de caractères du PIN excluant `"` et `\`,
 *   aucun échappement n'est nécessaire.
 */
function upsertEnvLine(content: string, key: string, value: string): string {
  const lineRegex = new RegExp(`^[ \\t]*${key}=[^\\r\\n]*$`, "m");
  const newLine = `${key}="${value}"`;

  if (lineRegex.test(content)) {
    return content.replace(lineRegex, newLine);
  }

  const trimmed = content.replace(/\r?\n+$/, "");
  const prefix = trimmed.length === 0 ? "" : `${trimmed}\n`;
  return `${prefix}${newLine}\n`;
}

/**
 * Écrit (upsert) une variable d'environnement dans `.env.local` et `.env`.
 *
 * @returns La liste des fichiers réellement modifiés (vide si aucun accessible).
 */
export async function upsertEnvFiles(
  key: string,
  value: string,
): Promise<string[]> {
  const updated: string[] = [];

  for (const fileName of ENV_FILES) {
    const filePath = path.join(process.cwd(), fileName);
    try {
      let content = "";
      try {
        content = await fs.readFile(filePath, "utf8");
      } catch {
        // Fichier absent → il sera créé avec la seule variable demandée.
      }

      const next = upsertEnvLine(content, key, value);
      if (next !== content) {
        await fs.writeFile(filePath, next, "utf8");
        updated.push(fileName);
      }
    } catch (error) {
      // FS lecture seule / permission refusée → best-effort, jamais bloquant.
      console.error(
        `[ADMIN_PIN_ENV] Impossible de persister ${key} dans ${fileName} :`,
        error,
      );
    }
  }

  return updated;
}
