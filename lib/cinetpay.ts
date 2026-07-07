// lib/cinetpay.ts — À jour avec AbortSignal

import crypto from "crypto";

export function verifyCinetPaySignature(
  signature: string,
  body: string
): boolean {
  const apiKey = process.env.CINETPAY_API_KEY;
  if (!apiKey) throw new Error("CINETPAY_API_KEY is not defined");

  const hash = crypto.createHmac("sha256", apiKey).update(body).digest("hex");

  // Timing-safe comparison (anti-timing attack)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    // Longueurs différentes = signature invalide
    return false;
  }
}

export async function checkCinetPayTransactionStatus(
  transactionId: string,
  signal?: AbortSignal
): Promise<string> {
  const siteId = process.env.CINETPAY_SITE_ID;
  const apiKey = process.env.CINETPAY_API_KEY;

  if (!siteId || !apiKey) {
    throw new Error("CinetPay credentials missing");
  }

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
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`CinetPay API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    code: string;
    data?: { status?: string };
    message?: string;
  };

  if (data.code === "00" && data.data?.status === "ACCEPTED") {
    return "ACCEPTED";
  }

  return data.data?.status ?? "FAILED";
}