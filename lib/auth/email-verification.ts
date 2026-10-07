import "server-only";
import { createTransport } from "nodemailer";

type VerificationEmail = {
  to: string;
  name: string;
  url: string;
};

function getSmtpConfig() {
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_APP_PASSWORD?.replace(/\s+/g, "");
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);

  if (!user || !password) {
    throw new Error(
      "[EMAIL VERIFICATION] SMTP_USER and SMTP_APP_PASSWORD must be configured before requiring email verification."
    );
  }

  if (!Number.isInteger(port) || (port !== 465 && port !== 587)) {
    throw new Error("[EMAIL VERIFICATION] SMTP_PORT must be 465 or 587.");
  }

  return { user, password, host, port };
}

export function assertEmailVerificationSmtpConfigured(): void {
  getSmtpConfig();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendAuthVerificationEmail({
  to,
  name,
  url,
}: VerificationEmail): Promise<void> {
  const { user, password, host, port } = getSmtpConfig();
  const safeName = escapeHtml(name.trim() || "Client");
  const safeUrl = escapeHtml(url);
  const transporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from: user,
    to,
    subject: "Vérifiez votre adresse email — Boutiquecogi3",
    text: `Bonjour ${name.trim() || "Client"},\n\nConfirmez votre adresse email en ouvrant ce lien :\n${url}\n\nSi vous n'avez pas créé de compte, ignorez cet email.\n\nBoutiquecogi3`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:24px auto;padding:32px;color:#111827">
        <h1>Vérifiez votre adresse email</h1>
        <p>Bonjour ${safeName},</p>
        <p>Confirmez votre adresse email pour activer votre compte Boutiquecogi3.</p>
        <p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#0891b2;color:#fff;text-decoration:none;border-radius:6px">Vérifier mon email</a></p>
        <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
        <p style="color:#6b7280">Boutiquecogi3</p>
      </div>
    `,
  });
}
