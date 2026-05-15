import type { CinetPayInitPayload, CinetPayInitResponse } from "./types";

const CINETPAY_API_URL = "https://api-checkout.cinetpay.com/v2/payment";

export function getCinetPayCredentials() {
  const apikey = process.env.CINETPAY_API_KEY;
  const site_id = process.env.CINETPAY_SITE_ID;

  if (!apikey || !site_id) {
    throw new Error("CinetPay n'est pas configuré (CINETPAY_API_KEY / CINETPAY_SITE_ID)");
  }

  return { apikey, site_id };
}

export async function initCinetPayPayment(
  payload: Omit<CinetPayInitPayload, "apikey" | "site_id">
): Promise<CinetPayInitResponse> {
  const { apikey, site_id } = getCinetPayCredentials();

  const response = await fetch(CINETPAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, site_id, ...payload }),
  });

  if (!response.ok) {
    throw new Error(`CinetPay HTTP ${response.status}`);
  }

  return response.json() as Promise<CinetPayInitResponse>;
}
