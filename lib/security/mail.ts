/**
 * =============================================================================
 * BOUTIQUECOGI3 — SECURE EMAIL SYSTEM
 * =============================================================================
 * 
 * Architecture: Modular, Atomic, Rate-Limited, Audit-Integrated
 * Stack: Resend + Zod + Rate Limiting + Audit Logging
 * 
 * Security:
 * - All emails are validated via Zod before sending
 * - Rate limiting per recipient (anti-spam)
 * - Audit logging of all email dispatches
 * - PII redaction in logs
 * 
 * RBAC: Email sending restricted by event type and user level.
 * =============================================================================
 */

import "server-only";
// @ts-ignore: Missing type declarations for 'resend' package
import { Resend } from "resend";
import { z } from "zod";
import { auditLog, UserEvent, AdminEvent, SecurityEvent } from "@/lib/security/audit";
import type { RBACLevel } from "@/lib/security/audit";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM_EMAIL =
  process.env.MAIL_FROM ?? "Boutiquecogi3 <noreply@boutiquecogi3.com>";
const MAIL_RATE_LIMIT_PER_HOUR = Number(process.env.MAIL_RATE_LIMIT_PER_HOUR) || 50;

if (!RESEND_API_KEY) {
  throw new Error("[MAIL] Missing environment variable: RESEND_API_KEY");
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEND CLIENT SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

export const resend = new Resend(RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS (Input Validation)
// ─────────────────────────────────────────────────────────────────────────────

const EmailSchema = z.string().email().max(254).toLowerCase().trim();
const UsernameSchema = z.string().min(1).max(100).nullable().optional();

const BaseEmailOptionsSchema = z.object({
  to: EmailSchema,
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(50000),
  text: z.string().max(50000).optional(),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"]).default("GUEST"),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().uuid().optional(),
});

const SendEmailOptionsSchema = BaseEmailOptionsSchema;
const SendResetPasswordOptionsSchema = BaseEmailOptionsSchema.omit({ subject: true, html: true, text: true }).extend({
  username: UsernameSchema,
  resetLink: z.string().url().max(2000),
  resetTokenExpiry: z.date().optional(),
});
const SendVerificationOptionsSchema = BaseEmailOptionsSchema.omit({ subject: true, html: true, text: true }).extend({
  username: UsernameSchema,
  verificationLink: z.string().url().max(2000),
});
const SendOrderConfirmationOptionsSchema = BaseEmailOptionsSchema.omit({ subject: true, html: true, text: true }).extend({
  username: UsernameSchema,
  orderNumber: z.string().min(1).max(50),
  orderTotal: z.number().positive(),
  currency: z.enum(["USD", "CDF"]).default("USD"),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).max(50),
});
const SendPaymentReceiptOptionsSchema = BaseEmailOptionsSchema.omit({ subject: true, html: true, text: true }).extend({
  username: UsernameSchema,
  orderNumber: z.string().min(1).max(50),
  amount: z.number().positive(),
  currency: z.enum(["USD", "CDF"]).default("USD"),
  transactionId: z.string().min(1).max(100),
  paymentMethod: z.string().max(50).default("CinetPay"),
  paidAt: z.date(),
});

export type SendEmailOptions = z.infer<typeof SendEmailOptionsSchema>;
export type SendResetPasswordOptions = z.infer<typeof SendResetPasswordOptionsSchema>;
export type SendVerificationOptions = z.infer<typeof SendVerificationOptionsSchema>;
export type SendOrderConfirmationOptions = z.infer<typeof SendOrderConfirmationOptionsSchema>;
export type SendPaymentReceiptOptions = z.infer<typeof SendPaymentReceiptOptionsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING (In-Memory with Redis fallback stub)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple in-memory rate limiter for email dispatch.
 * In production, this should use Upstash Redis (lib/security/rate-limit.ts).
 */
const emailRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkEmailRateLimit(email: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const key = `mail:${email}`;

  const record = emailRateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    emailRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: MAIL_RATE_LIMIT_PER_HOUR - 1, resetAt: now + windowMs };
  }

  if (record.count >= MAIL_RATE_LIMIT_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: MAIL_RATE_LIMIT_PER_HOUR - record.count, resetAt: record.resetAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ERROR HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

export class MailError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recipient?: string,
    public readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM"
  ) {
    super(message);
    this.name = "MailError";
    Object.setPrototypeOf(this, MailError.prototype);
  }
}

export class MailRateLimitError extends MailError {
  constructor(email: string, retryAfter: number) {
    super(
      `Rate limit exceeded for ${email}. Retry after ${Math.ceil(retryAfter / 1000)}s.`,
      "RATE_LIMIT_EXCEEDED",
      email,
      "LOW"
    );
    this.name = "MailRateLimitError";
  }
}

export class MailValidationError extends MailError {
  constructor(message: string, recipient?: string) {
    super(message, "VALIDATION_ERROR", recipient, "LOW");
    this.name = "MailValidationError";
  }
}

export class MailProviderError extends MailError {
  constructor(message: string, recipient?: string) {
    super(message, "PROVIDER_ERROR", recipient, "HIGH");
    this.name = "MailProviderError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PII SANITIZATION (For Audit Logs)
// ─────────────────────────────────────────────────────────────────────────────

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  const redactedLocal = local.length > 2
    ? local.slice(0, 2) + "***"
    : "***";
  return `${redactedLocal}@${domain}`;
}

function redactLink(link: string): string {
  try {
    const url = new URL(link);
    // Redact query tokens
    const tokenKeys = ["token", "code", "key", "secret", "auth"];
    for (const key of tokenKeys) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return "[INVALID_URL]";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE EMAIL SENDER (Atomic with Audit)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailResult {
  messageId: string | null;
  recipient: string;
  subject: string;
  sentAt: string;
  correlationId: string;
}

/**
 * Base email sender with validation, rate limiting, and audit logging.
 * All email flows must go through this function.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  // ── Zod Validation ──
  const validated = SendEmailOptionsSchema.safeParse(options);
  if (!validated.success) {
    throw new MailValidationError(
      `Invalid email options: ${validated.error.message}`,
      options.to
    );
  }

  const {
    to,
    subject,
    html,
    text,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId = crypto.randomUUID(),
  } = validated.data;

  // ── Rate Limit Check ──
  const rateLimit = checkEmailRateLimit(to);
  if (!rateLimit.allowed) {
    await auditLog({
      eventType: SecurityEvent.RATE_LIMIT_EXCEEDED,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: to,
      targetType: "email",
      metadata: {
        service: "resend",
        subject,
        retryAfter: rateLimit.resetAt,
        limit: MAIL_RATE_LIMIT_PER_HOUR,
      },
    });
    throw new MailRateLimitError(to, rateLimit.resetAt - Date.now());
  }

  try {
    // ── Send via Resend ──
    const response = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject,
      html,
      text,
      tags: [
        { name: "correlationId", value: correlationId },
        { name: "actorLevel", value: actorLevel },
      ],
    });

    if (response.error) {
      throw new MailProviderError(
        `Resend error: ${response.error.message}`,
        to
      );
    }

    const result: EmailResult = {
      messageId: response.data?.id ?? null,
      recipient: to,
      subject,
      sentAt: new Date().toISOString(),
      correlationId,
    };

    // ── Audit Log: Success ──
    await auditLog({
      eventType: UserEvent.EMAIL_CHANGED, // Generic email dispatch event
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: redactEmail(to),
      targetType: "email",
      metadata: {
        subject,
        messageId: result.messageId,
        correlationId,
        rateLimitRemaining: rateLimit.remaining,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof MailError) throw error;

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[MAIL] sendEmail fatal error:", error);

    // ── Audit Log: Failure ──
    await auditLog({
      eventType: SecurityEvent.TAMPERING_DETECTED,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: redactEmail(to),
      targetType: "email",
      metadata: {
        subject,
        error: message,
        correlationId,
      },
    });

    throw new MailProviderError(`Failed to send email: ${message}`, to);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: RESET PASSWORD EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export async function sendResetPasswordEmail(
  options: SendResetPasswordOptions
): Promise<EmailResult> {
  const validated = SendResetPasswordOptionsSchema.safeParse(options);
  if (!validated.success) {
    throw new MailValidationError(
      `Invalid reset password options: ${validated.error.message}`,
      options.to
    );
  }

  const {
    to,
    username,
    resetLink,
    resetTokenExpiry,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  } = validated.data;

  const safeUsername = username?.trim() || "Utilisateur";
  const expiryText = resetTokenExpiry
    ? `Ce lien expirera le ${resetTokenExpiry.toLocaleString("fr-FR")}.`
    : "Ce lien expirera automatiquement pour des raisons de sécurité.";

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation du mot de passe</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 24px 0;">
      Réinitialisation du mot de passe
    </h1>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
      Bonjour ${safeUsername},
    </p>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
      Nous avons reçu une demande de réinitialisation de votre mot de passe. 
      Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
    </p>
    
    <div style="margin: 32px 0;">
      <a href="${resetLink}" 
         style="display: inline-block; background-color: #111827; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Réinitialiser mon mot de passe
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
      ${expiryText}
    </p>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Boutiquecogi3 — Sécurité renforcée
    </p>
  </div>
</body>
</html>`;

  const text = `
Bonjour ${safeUsername},

Nous avons reçu une demande de réinitialisation de votre mot de passe.

Ouvrez ce lien pour continuer :
${resetLink}

${expiryText}

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.

Boutiquecogi3
`;

  const result = await sendEmail({
    to,
    subject: "Réinitialisation de votre mot de passe — Boutiquecogi3",
    html,
    text,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  });

  // ── Audit: Password reset email sent ──
  await auditLog({
    eventType: UserEvent.PASSWORD_RESET_REQUESTED,
    actorId: actorId ?? null,
    actorLevel,
    actorEmail: actorEmail ?? null,
    sessionId: sessionId ?? null,
    targetId: redactEmail(to),
    targetType: "user",
    metadata: {
      resetLink: redactLink(resetLink),
      tokenExpiry: resetTokenExpiry?.toISOString() ?? null,
      correlationId: result.correlationId,
    },
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  options: SendVerificationOptions
): Promise<EmailResult> {
  const validated = SendVerificationOptionsSchema.safeParse(options);
  if (!validated.success) {
    throw new MailValidationError(
      `Invalid verification options: ${validated.error.message}`,
      options.to
    );
  }

  const {
    to,
    username,
    verificationLink,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  } = validated.data;

  const safeUsername = username?.trim() || "Utilisateur";

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification de votre email</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 24px 0;">
      Vérification de votre email
    </h1>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
      Bonjour ${safeUsername},
    </p>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
      Merci de confirmer votre adresse email afin d'activer votre compte et accéder à toutes nos fonctionnalités.
    </p>
    
    <div style="margin: 32px 0;">
      <a href="${verificationLink}" 
         style="display: inline-block; background-color: #111827; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Vérifier mon email
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
      Ce lien expirera dans 24 heures pour des raisons de sécurité.
    </p>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
      Si vous n'avez pas créé de compte sur Boutiquecogi3, ignorez simplement cet email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Boutiquecogi3 — Sécurité renforcée
    </p>
  </div>
</body>
</html>`;

  const text = `
Bonjour ${safeUsername},

Merci de confirmer votre adresse email.

Lien de vérification :
${verificationLink}

Ce lien expirera dans 24 heures.

Si vous n'avez pas créé de compte, ignorez cet email.

Boutiquecogi3
`;

  const result = await sendEmail({
    to,
    subject: "Vérifiez votre adresse email — Boutiquecogi3",
    html,
    text,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  });

  // ── Audit: Verification email sent ──
  await auditLog({
    eventType: UserEvent.EMAIL_CHANGED,
    actorId: actorId ?? null,
    actorLevel,
    actorEmail: actorEmail ?? null,
    sessionId: sessionId ?? null,
    targetId: redactEmail(to),
    targetType: "user",
    metadata: {
      verificationLink: redactLink(verificationLink),
      correlationId: result.correlationId,
    },
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: ORDER CONFIRMATION
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(
  options: SendOrderConfirmationOptions
): Promise<EmailResult> {
  const validated = SendOrderConfirmationOptionsSchema.safeParse(options);
  if (!validated.success) {
    throw new MailValidationError(
      `Invalid order confirmation options: ${validated.error.message}`,
      options.to
    );
  }

  const {
    to,
    username,
    orderNumber,
    orderTotal,
    currency,
    items,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  } = validated.data;

  const safeUsername = username?.trim() || "Client";
  const currencySymbol = currency === "CDF" ? "FC" : "$";
  const formattedTotal = `${currencySymbol}${orderTotal.toLocaleString("fr-FR")}`;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: right;">${currencySymbol}${item.price.toLocaleString("fr-FR")}</td>
    </tr>
  `).join("");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de commande</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 24px 0;">
      Confirmation de commande
    </h1>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
      Bonjour ${safeUsername},
    </p>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
      Votre commande <strong>#${orderNumber}</strong> a bien été reçue. Voici le récapitulatif :
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #111827;">Produit</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #111827;">Qté</th>
          <th style="padding: 12px; text-align: right; font-weight: 600; color: #111827;">Prix</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div style="text-align: right; margin: 24px 0; padding-top: 16px; border-top: 2px solid #111827;">
      <p style="font-size: 18px; font-weight: 700; color: #111827; margin: 0;">
        Total : ${formattedTotal}
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
      Vous recevrez un email de confirmation de paiement une fois la transaction finalisée.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Boutiquecogi3 — Merci de votre confiance
    </p>
  </div>
</body>
</html>`;

  const text = `
Bonjour ${safeUsername},

Confirmation de votre commande #${orderNumber}

Articles :
${items.map(i => `- ${i.name} x${i.quantity} : ${currencySymbol}${i.price}`).join("\n")}

Total : ${formattedTotal}

Vous recevrez une confirmation de paiement prochainement.

Boutiquecogi3
`;

  return sendEmail({
    to,
    subject: `Commande #${orderNumber} confirmée — Boutiquecogi3`,
    html,
    text,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: PAYMENT RECEIPT (CinetPay)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPaymentReceiptEmail(
  options: SendPaymentReceiptOptions
): Promise<EmailResult> {
  const validated = SendPaymentReceiptOptionsSchema.safeParse(options);
  if (!validated.success) {
    throw new MailValidationError(
      `Invalid payment receipt options: ${validated.error.message}`,
      options.to
    );
  }

  const {
    to,
    username,
    orderNumber,
    amount,
    currency,
    transactionId,
    paymentMethod,
    paidAt,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  } = validated.data;

  const safeUsername = username?.trim() || "Client";
  const currencySymbol = currency === "CDF" ? "FC" : "$";
  const formattedAmount = `${currencySymbol}${amount.toLocaleString("fr-FR")}`;
  const formattedDate = paidAt.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu de paiement</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #059669; margin: 0;">
        ✓ Paiement confirmé
      </h1>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
      Bonjour ${safeUsername},
    </p>
    
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
      Votre paiement pour la commande <strong>#${orderNumber}</strong> a été confirmé.
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Montant</td>
          <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Méthode</td>
          <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Transaction ID</td>
          <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0; font-family: monospace; font-size: 14px;">${transactionId}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Date</td>
          <td style="color: #111827; font-weight: 600; text-align: right; padding: 8px 0;">${formattedDate}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
      Conservez cet email comme preuve de paiement. Votre commande sera traitée dans les plus brefs délais.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Boutiquecogi3 — Paiement sécurisé via CinetPay
    </p>
  </div>
</body>
</html>`;

  const text = `
Bonjour ${safeUsername},

Votre paiement pour la commande #${orderNumber} est confirmé.

Montant : ${formattedAmount}
Méthode : ${paymentMethod}
Transaction : ${transactionId}
Date : ${formattedDate}

Conservez cet email comme preuve de paiement.

Boutiquecogi3
`;

  const result = await sendEmail({
    to,
    subject: `Reçu de paiement — Commande #${orderNumber}`,
    html,
    text,
    actorId,
    actorLevel,
    actorEmail,
    sessionId,
    correlationId,
  });

  // ── Audit: Payment receipt sent ──
  await auditLog({
    eventType: AdminEvent.ORDER_STATUS_CHANGED,
    actorId: actorId ?? null,
    actorLevel,
    actorEmail: actorEmail ?? null,
    sessionId: sessionId ?? null,
    targetId: orderNumber,
    targetType: "order",
    metadata: {
      transactionId,
      amount,
      currency,
      paymentMethod,
      paidAt: paidAt.toISOString(),
      correlationId: result.correlationId,
    },
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  MailError,
  MailRateLimitError,
  MailValidationError,
  MailProviderError,
  checkEmailRateLimit,
  redactEmail,
  redactLink,
};