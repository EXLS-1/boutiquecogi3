export { cn } from "@/lib/utils/cn";
export { checkSupabaseEnvVars, hasEnvVars, createUrl } from "@/lib/utils/utils";

/**
 * Vérifie si une chaîne de caractères correspond au format d'un UUID valide.
 * Utilisé pour éviter les erreurs de typage PostgreSQL lors des requêtes Prisma.
 *
 * @param str - La chaîne à valider.
 * @returns `true` si le format est valide, `false` sinon.
 */
export const isValidUuid = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};
