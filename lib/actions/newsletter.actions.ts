// lib/actions/newsletter.actions.ts

"use server";

import { prisma } from "@/lib/prisma";
import { SubscriptionResult } from "@/components/newsletter/newsletter-success.client";
import { generateUUIDv7 } from "@/lib/uuid";
import { EmailSchema } from "@/components/newsletter/newsletter.schema";

/**
 * Action serveur robuste pour l'inscription à la newsletter.
 * Gère l'idempotence (évite les doublons) et utilise UUID v7.
 */
export async function subscribeToNewsletter(
  email: string,
): Promise<SubscriptionResult> {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez fournir une adresse e-mail valide.",
    };
  }

  const cleanEmail = parsed.data;

  try {
    // Vérification de l'existence préalable
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        success: true,
        message: "Vous êtes déjà inscrit à notre newsletter !",
      };
    }

    // Création de l'abonné avec UUID v7
    await prisma.newsletterSubscriber.create({
      data: {
        id: generateUUIDv7(),
        email,
      },
    });

    return {
      success: true,
      message: "Merci ! Votre inscription a été prise en compte.",
    };
  } catch (error) {
    console.error("[NEWSLETTER_SUBSCRIBE_ERROR]", error);
    return {
      success: false,
      message: "Une erreur technique est survenue. Veuillez réessayer.",
    };
  }
}
