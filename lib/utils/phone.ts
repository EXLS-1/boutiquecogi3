// lib/utils/phone.ts
/**
 * Normalise un numéro de téléphone au format E.164 international.
 * Par défaut ciblé pour la RDC (+243).
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountryCode: string = "243"
): string | null {
  if (!phone) return null;

  // Supprime tous les caractères non numériques sauf le '+'
  let cleaned = phone.trim().replace(/[^\d+]/g, "");

  // Si commence par '+', vérifier le format
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0")) {
    // Si commence par un zéro local (ex: 081...), remplacer par l'indicatif du pays
    cleaned = `${defaultCountryCode}${cleaned.substring(1)}`;
  } else if (cleaned.length === 9) {
    // Si saisie directe à 9 chiffres sans le zéro initial
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  // Vérification de la longueur standard (pour la RDC : 243 + 9 chiffres = 12 chiffres)
  if (!/^\d{12}$/.test(cleaned)) {
    return null; // Numéro invalide
  }

  return `+${cleaned}`;
}
