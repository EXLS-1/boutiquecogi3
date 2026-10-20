import "server-only";
import { sendEmail } from "@/lib/email";

type VerificationEmail = {
  to: string;
  name: string;
  url: string;
};

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

export function assertEmailVerificationSmtpConfigured(): void {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "[EMAIL VERIFICATION] RESEND_API_KEY must be configured before requiring email verification."
    );
  }
}

export async function sendAuthVerificationEmail({
  to,
  name,
  url,
}: VerificationEmail): Promise<void> {
  const safeName = name.trim() || "Client";

  await sendEmail({
    to,
    subject: "Vérifiez votre adresse email — Boutiquecogi3",
    text: `Bonjour ${safeName},\n\nConfirmez votre adresse email en ouvrant ce lien :\n${url}\n\nSi vous n'avez pas créé de compte, ignorez cet email.\n\nBoutiquecogi3`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:24px auto;padding:32px;color:#111827">
        <h1>Vérifiez votre adresse email</h1>
        <p>Bonjour ${safeName},</p>
        <p>Confirmez votre adresse email pour activer votre compte Boutiquecogi3.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0891b2;color:#fff;text-decoration:none;border-radius:6px">Vérifier mon email</a></p>
        <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
        <p style="color:#6b7280">Boutiquecogi3</p>
      </div>
    `,
  });
}
