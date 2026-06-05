// lib/cinetpay.ts
// CinetPay est une plateforme de paiement populaire en Afrique francophone.
// Ce module contient des fonctions utilitaires pour vérifier les signatures HMAC des webhooks et pour faire des vérifications Server-to-Server auprès de l'API CinetPay, afin d'assurer la sécurité et l'intégrité des notifications de paiement reçues.
// La validation de la signature HMAC est cruciale pour s'assurer que les notifications proviennent bien de CinetPay et n'ont pas été falsifiées en cours de route.
// La vérification Server-to-Server est une étape supplémentaire pour éviter les attaques de type "fake webhook", où un attaquant pourrait envoyer de fausses notifications de paiement. En vérifiant directement auprès de l'API de CinetPay, on s'assure que la transaction est bien réelle et a été acceptée par CinetPay avant de mettre à jour le statut de la commande dans notre système.
// Note: Assurez-vous de stocker les clés API de CinetPay de manière sécurisée dans les variables d'environnement et de ne jamais les exposer côté client.
// Ce module est utilisé dans la route API /api/webhook/cinetpay pour traiter les notifications de paiement entrantes.
// Importation de la bibliothèque crypto pour le calcul du HMAC

import crypto from "crypto";

/**
 * Vérifie la signature HMAC envoyée par CinetPay.
 * @param signature Le token contenu dans le header 'x-token'
 * @param body Le corps brut de la requête
 */
export function verifyCinetPaySignature(
  signature: string,
  body: string,
): boolean {
  const apiKey = process.env.CINETPAY_API_KEY;
  if (!apiKey) throw new Error("CINETPAY_API_KEY is not defined");

  // Note: CinetPay génère le hash sur le body brut
  const hash = crypto.createHmac("sha256", apiKey).update(body).digest("hex");

  return hash === signature;
}

/**
 * Vérifie l'état réel d'une transaction auprès de l'API CinetPay (Server-to-Server).
 * Indispensable pour éviter les injections de faux webhooks.
 */
export async function checkCinetPayTransactionStatus(transactionId: string) {
  const siteId = process.env.CINETPAY_SITE_ID;
  const apiKey = process.env.CINETPAY_API_KEY;

  const response = await fetch(
    "https://api-checkout.cinetpay.com/v2/payment/check",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`CinetPay API error: ${response.statusText}`);
  }

  const data = await response.json();

  // CinetPay renvoie '00' pour un succès (ACCEPTED)
  if (data.code === "00" && data.data.status === "ACCEPTED") {
    return "ACCEPTED";
  }

  return data.data.status || "FAILED";
}
