// lib/auth.ts
// ============================================
// SINGLETON BETTER-AUTH — Configuration centrale
// ============================================
// Ce fichier est le SEUL point d'instanciation de betterAuth().
// Tout import de `auth` doit passer par ici.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Instance singleton de Better-Auth.
 * Ne JAMAIS réinstancier betterAuth() ailleurs.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  appName: "Boutiquecogi3",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24,     // Refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
});
