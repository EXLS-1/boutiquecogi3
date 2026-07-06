// app/actions/newsletter-fallback.ts

import type { SubscriptionResult } from "@/lib/actions/newsletter.actions";

/**
 * Fallback temporaire.
 * (Utilisé uniquement pour éviter de casser la compilation.)
 */
export async function handleSubscribe(email: string): Promise<SubscriptionResult> {
  return {
    success: false,
    message: `Service newsletter indisponible pour le moment pour l'adresse ${email}. Réessayez plus tard.`,
  };
}

