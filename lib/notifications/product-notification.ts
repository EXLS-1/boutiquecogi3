
// lib/notifications/product-notification.ts
// =============================================================================
// NOTIFICATIONS PRODUIT — Workflow + Alertes
// =============================================================================
// Envoie des notifications (email + in-app) pour les événements du workflow
// produit : soumission en PENDING, publication, échec de publication, etc.
// =============================================================================

import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductPendingNotification {
  productId: string;
  productName: string;
  sku: string;
  submittedBy?: string;
}

export interface ProductPublishedNotification {
  productId: string;
  productName: string;
  sku: string;
  publishedBy?: string;
}

// ─── Service de notification ─────────────────────────────────────────────────

/**
 * Notifie les administrateurs (Level 5+) qu'un produit est en attente
 * de validation (statut PENDING).
 */
export async function notifyProductPendingApproval(
  params: ProductPendingNotification,
): Promise<void> {
  const { productId, productName, sku, submittedBy } = params;

  try {
    // ── 1. Récupérer les admins notifiables ──
    const admins = await prisma.roleAssignment.findMany({
      where: {
        roleConfig: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
        isBlocked: false,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (admins.length === 0) {
      console.warn("[ProductNotification] Aucun admin notifiable trouvé");
      return;
    }

    // ── 2. Informations sur le soumetteur ──
    let submittedByName: string | undefined;
    if (submittedBy) {
      const submitter = await prisma.user.findUnique({
        where: { id: submittedBy },
        select: { name: true, email: true },
      });
      submittedByName = submitter?.name ?? submitter?.email ?? undefined;
    }

    // ── 3. Récupérer le prix du produit ──
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { basePrice: true, updatedAt: true },
    });

    const price = product
      ? `${(Number(product.basePrice) / 100).toFixed(2)} USD`
      : "N/A";
    const submittedAt = product?.updatedAt
      ? new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(product.updatedAt)
      : undefined;

    const productUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://boutiquecogi3.com"}/admin/product/${productId}`;

    // ── 4. Envoyer email à chaque admin (fire-and-forget) ──
    const emailPromises = admins.map((assignment) => {
      if (!assignment.user.email) return Promise.resolve();
      const { email, name } = assignment.user;

      return sendEmail({
        to: email,
        subject: `🕓 Validation requise — ${productName} (${sku})`,
        html: buildPendingEmailHtml({
          productName,
          sku,
          price,
          submittedByName,
          submittedAt,
          productUrl,
          recipientName: name ?? undefined,
        }),
        text: buildPendingEmailText({
          productName,
          sku,
          price,
          submittedByName,
          submittedAt,
          productUrl,
        }),
      }).catch((err) => {
        console.error(`[ProductNotification] Email échoué à ${email}:`, err);
      });
    });

    await Promise.allSettled(emailPromises);

    // ── 5. Notification in-app pour chaque admin ──
    const notificationData = admins.map((assignment) => ({
      userId: assignment.user.id,
      type: "product_pending_approval",
      title: "Produit en attente de validation",
      message: `${productName} (${sku}) a été soumis pour validation.`,
    }));

    await prisma.notification.createMany({
      data: notificationData,
    });

    console.log(
      `[ProductNotification] ${admins.length} admin(s) notifié(s) pour ${productName}`,
    );
  } catch (error) {
    console.error("[ProductNotification] Erreur globale:", error);
  }
}

/**
 * Notifie les utilisateurs qu'un produit a été publié.
 */
export async function notifyProductPublished(
  params: ProductPublishedNotification,
): Promise<void> {
  const { productId, productName, sku } = params;

  try {
    // Notifier le créateur du produit
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true, createdBy: true },
    });

    const targetUserId = product?.createdBy ?? product?.userId;
    if (!targetUserId) return;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    const productUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://boutiquecogi3.com"}/products/${productId}`;

    await sendEmail({
      to: user.email,
      subject: `✅ Publié — ${productName} (${sku})`,
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
                <span style="color:#fff;font-size:24px;">✅</span>
              </div>
              <h1 style="color:#fafafa;font-size:20px;font-weight:600;margin:0 0 8px;">Produit publié</h1>
              <p style="color:#a3a3a3;font-size:14px;margin:0;line-height:1.6;">
                Bonjour <strong style="color:#e5e5e5;">${user.name ?? "utilisateur"}</strong>,<br>
                Votre produit <strong style="color:#10b981;">${productName}</strong> est en ligne.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="${productUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">
                Voir le produit
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #262626;">
              <p style="color:#525252;font-size:11px;margin:0;">
                ${process.env.NEXT_PUBLIC_APP_NAME || "Boutiquecogi3"} — Notification automatique.
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
    });

    // Notification in-app
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "product_published",
        title: "Produit publié",
        message: `Votre produit ${productName} (${sku}) a été publié.`,
      },
    });
  } catch (error) {
    console.error("[ProductNotification] Erreur publication:", error);
  }
}

// ─── Helpers de template HTML/Text ───────────────────────────────────────────

interface TemplateProps {
  productName: string;
  sku: string;
  price: string;
  submittedByName?: string;
  submittedAt?: string;
  productUrl: string;
  recipientName?: string;
}

function buildPendingEmailHtml(props: TemplateProps): string {
  return `
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
              <div style="width:48px;height:48px;background:#f59e0b;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="color:#fff;font-size:24px;">🕓</span>
              </div>
              <h1 style="color:#fafafa;font-size:20px;font-weight:600;margin:0 0 8px;">Nouveau produit en attente</h1>
              <p style="color:#a3a3a3;font-size:14px;margin:0;line-height:1.6;">
                ${props.recipientName ? `Bonjour <strong style="color:#e5e5e5;">${props.recipientName}</strong>,<br>` : ""}
                Le produit <strong style="color:#e5e5e5;">${props.productName}</strong> a été soumis
                pour validation.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #262626;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 12px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Détails du produit</p>
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Nom</span>
                      <span style="color:#e5e5e5;font-size:14px;">${props.productName}</span>
                    </div>
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">SKU</span>
                      <span style="color:#e5e5e5;font-size:14px;font-family:ui-monospace,monospace;">${props.sku}</span>
                    </div>
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Prix</span>
                      <span style="color:#e5e5e5;font-size:14px;">${props.price}</span>
                    </div>
                    ${props.submittedByName ? `
                    <div style="margin-bottom:10px;">
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Soumis par</span>
                      <span style="color:#e5e5e5;font-size:14px;">${props.submittedByName}</span>
                    </div>
                    ` : ""}
                    ${props.submittedAt ? `
                    <div>
                      <span style="color:#525252;font-size:12px;display:block;margin-bottom:2px;">Date</span>
                      <span style="color:#e5e5e5;font-size:14px;">${props.submittedAt}</span>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="${props.productUrl}" style="display:inline-block;background:#f59e0b;color:#0a0a0a;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
                Voir le brouillon
              </a>
              <p style="color:#737373;font-size:11px;margin:16px 0 0;">
                Vous pouvez approuver, modifier ou archiver ce produit depuis le tableau de bord.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #262626;">
              <p style="color:#525252;font-size:11px;margin:0;">
                Notification automatique de workflow produit. Ne pas répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function buildPendingEmailText(props: TemplateProps): string {
  return `Nouveau produit en attente de validation
${"-".repeat(40)}
${props.recipientName ? `Bonjour ${props.recipientName},\n\n` : ""}
Le produit "${props.productName}" a été soumis pour validation.

Détails :
  Nom  : ${props.productName}
  SKU  : ${props.sku}
  Prix : ${props.price}
${props.submittedByName ? `  Soumis par : ${props.submittedByName}\n` : ""}${props.submittedAt ? `  Date : ${props.submittedAt}\n` : ""}
Approuver depuis : ${props.productUrl}

Vous pouvez approuver, modifier ou archiver ce produit depuis le tableau de bord.
`;
}
