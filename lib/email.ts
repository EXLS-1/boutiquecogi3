// lib/email.ts
// Safe email abstraction — NEVER throws, logs warnings on missing API key.
// Uses Resend via raw fetch (no dependency on resend npm package).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "security@boutiquecogi3.com";
const APP_NAME = "Boutiquecogi3";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY manquant — notification non envoyée");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[Email] Échec envoi à ${payload.to}:`, err);
    }
  } catch (err) {
    console.error(`[Email] Exception lors de l'envoi à ${payload.to}:`, err);
  }
}

// ─── Template : Connexion Super Admin ──────────────────────────

export function buildSuperAdminLoginEmail(params: {
  name: string;
  date: string;
  ip: string;
  userAgent: string;
  location?: string;
}) {
  const { name, date, ip, userAgent, location } = params;

  return {
    subject: `🔒 Connexion Super Admin — ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid #262626;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <div style="width:48px;height:48px;background:#059669;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="color:#fff;font-size:24px;">🔒</span>
              </div>
              <h1 style="color:#fafafa;font-size:20px;font-weight:600;margin:0 0 8px;">Connexion Super Admin détectée</h1>
              <p style="color:#a3a3a3;font-size:14px;margin:0;line-height:1.6;">
                Bonjour <strong style="color:#e5e5e5;">${name}</strong>,<br>
                Une connexion avec ton rôle <strong style="color:#059669;">SUPER_ADMIN</strong> vient d'être validée.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #262626;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 12px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Détails de la connexion</p>
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Date & heure</span>
                      <span style="color:#e5e5e5;font-size:14px;font-family:ui-monospace,monospace;">${date}</span>
                    </div>
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Adresse IP</span>
                      <span style="color:#e5e5e5;font-size:14px;font-family:ui-monospace,monospace;">${ip}</span>
                    </div>
                    ${location ? `
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Localisation estimée</span>
                      <span style="color:#e5e5e5;font-size:14px;">${location}</span>
                    </div>
                    ` : ""}
                    <div>
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Navigateur / Appareil</span>
                      <span style="color:#e5e5e5;font-size:14px;word-break:break-all;">${userAgent}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:0 0 16px;">
                <strong style="color:#e5e5e5;">Tu as initié cette connexion ?</strong><br>
                Aucune action requise. Tu peux ignorer cet email.
              </p>
              <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:0 0 24px;">
                <strong style="color:#ef4444;">Tu ne reconnais pas cette connexion ?</strong><br>
                Change immédiatement ton mot de passe et révoque toutes les sessions actives depuis ton tableau de bord.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://boutiquecogi3.com"}/admin/security" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">
                Voir l'activité de sécurité
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #262626;">
              <p style="color:#525252;font-size:11px;margin:0;">
                ${APP_NAME} — Notification automatique de sécurité. Ne pas répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Connexion Super Admin détectée sur ${APP_NAME}
    
Date : ${date}
IP : ${ip}
Navigateur : ${userAgent}

Si c'était toi, ignore cet email.
Sinon, change ton mot de passe immédiatement.`,
  };
}
