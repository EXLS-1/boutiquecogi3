// lib/mail.ts

import "server-only";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing environment variable: RESEND_API_KEY");
}

export const resend = new Resend(resendApiKey);

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const DEFAULT_FROM_EMAIL =
  process.env.MAIL_FROM ?? "Boutiquecogi3 <noreply@boutiquecogi3.com>";

/**
 * =========================================================
 * Base Email Sender
 * =========================================================
 */

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const response = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (response.error) {
      console.error("[MAIL_SEND_ERROR]", response.error);

      throw new Error("Failed to send email.");
    }

    return response.data;
  } catch (error) {
    console.error("[MAIL_UNKNOWN_ERROR]", error);

    throw error;
  }
}

/**
 * =========================================================
 * Forgot Password Email
 * =========================================================
 */

type SendResetPasswordEmailOptions = {
  email: string;
  username?: string | null;
  resetLink: string;
};

export async function sendResetPasswordEmail({
  email,
  username,
  resetLink,
}: SendResetPasswordEmailOptions) {
  const safeUsername = username?.trim() || "Utilisateur";

  const html = `
  <div
    style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      color: #111827;
      line-height: 1.6;
    "
  >
    <h1
      style="
        font-size: 24px;
        margin-bottom: 24px;
      "
    >
      Réinitialisation du mot de passe
    </h1>

    <p>
      Bonjour ${safeUsername},
    </p>

    <p>
      Nous avons reçu une demande de réinitialisation
      de votre mot de passe.
    </p>

    <p>
      Cliquez sur le bouton ci-dessous pour définir
      un nouveau mot de passe :
    </p>

    <div style="margin: 32px 0;">
      <a
        href="${resetLink}"
        style="
          display: inline-block;
          background-color: #111827;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
        "
      >
        Réinitialiser mon mot de passe
      </a>
    </div>

    <p>
      Si vous n’êtes pas à l’origine de cette demande,
      vous pouvez ignorer cet email.
    </p>

    <p>
      Ce lien expirera automatiquement pour des raisons
      de sécurité.
    </p>

    <hr
      style="
        margin: 32px 0;
        border: none;
        border-top: 1px solid #e5e7eb;
      "
    />

    <p
      style="
        font-size: 12px;
        color: #6b7280;
      "
    >
      Boutiquecogi3
    </p>
  </div>
  `;

  const text = `
Bonjour ${safeUsername},

Nous avons reçu une demande de réinitialisation
de votre mot de passe.

Ouvrez ce lien pour continuer :
${resetLink}

Si vous n'êtes pas à l'origine de cette demande,
ignorez simplement cet email.

Boutiquecogi3
`;

  return sendEmail({
    to: email,
    subject: "Réinitialisation du mot de passe",
    html,
    text,
  });
}

/**
 * =========================================================
 * Email Verification
 * =========================================================
 */

type SendVerificationEmailOptions = {
  email: string;
  username?: string | null;
  verificationLink: string;
};

export async function sendVerificationEmail({
  email,
  username,
  verificationLink,
}: SendVerificationEmailOptions) {
  const safeUsername = username?.trim() || "Utilisateur";

  const html = `
  <div
    style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      color: #111827;
      line-height: 1.6;
    "
  >
    <h1
      style="
        font-size: 24px;
        margin-bottom: 24px;
      "
    >
      Vérification de votre email
    </h1>

    <p>
      Bonjour ${safeUsername},
    </p>

    <p>
      Merci de confirmer votre adresse email afin
      d'activer votre compte.
    </p>

    <div style="margin: 32px 0;">
      <a
        href="${verificationLink}"
        style="
          display: inline-block;
          background-color: #111827;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
        "
      >
        Vérifier mon email
      </a>
    </div>

    <p>
      Si vous n'avez pas créé de compte,
      ignorez simplement cet email.
    </p>

    <hr
      style="
        margin: 32px 0;
        border: none;
        border-top: 1px solid #e5e7eb;
      "
    />

    <p
      style="
        font-size: 12px;
        color: #6b7280;
      "
    >
      Boutiquecogi3
    </p>
  </div>
  `;

  const text = `
Bonjour ${safeUsername},

Merci de confirmer votre adresse email.

Lien de vérification :
${verificationLink}

Boutiquecogi3
`;

  return sendEmail({
    to: email,
    subject: "Vérifiez votre adresse email",
    html,
    text,
  });
}
