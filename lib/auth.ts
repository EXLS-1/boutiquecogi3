// lib/auth.ts

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/uuid";

// Validation stricte des variables d'environnement.
function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(
      `[AUTH ENV ERROR] Missing environment variable: ${name}`,
    );
  }

  return value;
}

// URL publique de l'application.
const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "http://localhost:3000";

// Validation stricte production.
if (
  process.env.NODE_ENV === "production" &&
  baseURL.includes("localhost")
) {
  throw new Error(
    "[AUTH ERROR] Invalid production baseURL.",
  );
}

// Configuration Better Auth.
export const auth = betterAuth({
  // Adapter Prisma PostgreSQL.
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Secret JWT/session obligatoire.
  secret: requiredEnv(
    "BETTER_AUTH_SECRET",
  ),
  // URL publique application.
  baseURL,
  // Configuration avancée.
  advanced: {
    // UUID v7 monotonic.
    generateId: generateUUIDv7,
  },
  // Auth email/password.
  emailAndPassword: {
    enabled: true,
    // Désactivé volontairement pour meilleure sécurité e-commerce.
    autoSignIn: false,
    // Politique mot de passe minimale.
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Recommandé pour validation email future.
    requireEmailVerification: false,
  },

  // Champs custom utilisateur.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
         // Empêche injection client
        input: false,
      },
    },
  },

  // OAuth providers.
  socialProviders: {
    google: {
      enabled:
        !!process.env.GOOGLE_CLIENT_ID &&
        !!process.env.GOOGLE_CLIENT_SECRET,
      clientId:
        process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? "",
    },

    facebook: {
      enabled:
        !!process.env.FACEBOOK_CLIENT_ID &&
        !!process.env.FACEBOOK_CLIENT_SECRET,
      clientId:
        process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret:
        process.env.FACEBOOK_CLIENT_SECRET ?? "",
    },
  },
  
  // Next.js cookies integration.
  plugins: [nextCookies()],
  
  // Session configuration.
  session: {
  // Expiration 30 jours.
    expiresIn: 60 * 60 * 24 * 30,
  // Rotation session.
    updateAge: 60 * 60 * 24,
  },
  
  // Trusted origins production.
  trustedOrigins: [
    baseURL,
  ],
});
