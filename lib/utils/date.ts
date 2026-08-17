// lib/utils/date.ts

/**
 * Module centralisé de gestion et formatage des dates en français (locale fr-FR / fr-CD).
 */

export type DateInput = Date | string | number | null | undefined;

/**
 * Parse de manière sécurisée une entrée de date vers un objet Date valide.
 * Retourne null si la date est invalide ou manquante.
 */
export function parseDate(date: DateInput): Date | null {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Vérifie si une valeur est une date valide.
 */
export function isValidDate(date: unknown): date is Date {
  if (!date) return false;
  const parsed = date instanceof Date ? date : new Date(date as string | number);
  return !isNaN(parsed.getTime());
}

/**
 * Formate une date en français (ex: "16 août 2026").
 * Par défaut : jour, mois long, année.
 */
export function formatDateFR(
  date: DateInput,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
  fallback: string = "—"
): string {
  const d = parseDate(date);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat("fr-FR", options).format(d);
  } catch {
    return d.toLocaleDateString("fr-FR");
  }
}

/**
 * Formate une date au format court numérique (ex: "16/08/2026").
 */
export function formatDateShortFR(
  date: DateInput,
  fallback: string = "—"
): string {
  return formatDateFR(
    date,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    fallback
  );
}

/**
 * Formate une date avec heure en français (ex: "16 août 2026 à 21:10" ou "16/08/2026 21:10").
 */
export function formatDateTimeFR(
  date: DateInput,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  fallback: string = "—"
): string {
  const d = parseDate(date);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat("fr-FR", options).format(d);
  } catch {
    return d.toLocaleString("fr-FR");
  }
}

/**
 * Formate une date en format relatif (ex: "il y a 2 jours", "aujourd'hui", "dans 3 heures").
 */
export function formatRelativeDateFR(
  date: DateInput,
  fallback: string = "—"
): string {
  const d = parseDate(date);
  if (!d) return fallback;

  const now = new Date();
  const diffInSeconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const absDiff = Math.abs(diffInSeconds);

  // Moins d'une minute
  if (absDiff < 60) {
    return "à l'instant";
  }

  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  // Minutes
  if (absDiff < 3600) {
    const minutes = Math.round(diffInSeconds / 60);
    return rtf.format(minutes, "minute");
  }

  // Heures
  if (absDiff < 86400) {
    const hours = Math.round(diffInSeconds / 3600);
    return rtf.format(hours, "hour");
  }

  // Jours
  if (absDiff < 2592000) {
    const days = Math.round(diffInSeconds / 86400);
    return rtf.format(days, "day");
  }

  // Mois
  if (absDiff < 31536000) {
    const months = Math.round(diffInSeconds / 2592000);
    return rtf.format(months, "month");
  }

  // Années
  const years = Math.round(diffInSeconds / 31536000);
  return rtf.format(years, "year");
}

/**
 * Formate une date au format ISO standard (YYYY-MM-DD).
 */
export function formatDateISO(date: DateInput, fallback: string = ""): string {
  const d = parseDate(date);
  if (!d) return fallback;
  return d.toISOString().split("T")[0];
}
