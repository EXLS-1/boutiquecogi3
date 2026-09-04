// lib/validations/cinetpay.ts
// Schéma Zod du payload webhook CinetPay — valide la structure AVANT tout traitement.
// Conçu pour tolérer à la fois les champs standards CinetPay (cpm_result) et les
// champs décrits dans l'architecture anti-replay (code, message, cpm_page_action).

import { z } from "zod";
import { Currency } from "@prisma/client";

export const cinetPayWebhookSchema = z.object({
  cpm_trans_id: z.string().min(1, "Transaction ID obligatoire"),
  cpm_site_id: z.string().min(1, "Site ID obligatoire"),
  cpm_amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const n = typeof val === "number" ? val : Number.parseFloat(val.replace(",", "."));
      return Number.isNaN(n) ? 0 : n;
    }),
  cpm_currency: z.enum(Currency),
  cpm_trans_date: z.string().optional(),
  cpm_payment_config: z.string().optional(),
  cpm_page_action: z.string().optional(),
  cpm_custom: z.string().optional(),
  cpm_result: z.string().optional(), // Champ de résultat réellement envoyé par CinetPay
  code: z.string().optional(),
  message: z.string().optional(),
  signature: z.string().optional(),
  // Champs de fraîcheur temporelle (anti-replay)
  cpm_payment_date: z.string().optional(),
  cpm_payment_time: z.string().optional(),
});

export type CinetPayWebhookPayload = z.infer<typeof cinetPayWebhookSchema>;
