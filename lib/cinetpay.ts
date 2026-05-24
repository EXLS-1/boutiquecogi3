import crypto from "crypto";

/**
 * Vérifie l'authenticité des notifications CinetPay via HMAC SHA256.
 * Cette implémentation est optimisée pour la performance et la sécurité.
 *
 * @param signature - Le hash reçu dans le header 'x-token' de la notification.
 * @param body - Le corps brut (raw body) de la requête reçu de CinetPay.
 * @returns boolean - True si la signature correspond à l'API Key configurée.
 */
export function verifyCinetPaySignature(
  signature: string,
  body: string,
): boolean {
  const apiKey = process.env.CINETPAY_API_KEY;

  if (!apiKey || !signature) {
    return false;
  }

  // Génération du hash attendu à partir du corps de la requête et de votre clé secrète
  const expectedSignature = crypto
    .createHmac("sha256", apiKey)
    .update(body)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  // Comparaison sécurisée contre les attaques temporelles (Timing Attack Protection)
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
