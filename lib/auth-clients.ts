"use client";

// Client-side facade for BetterAuth.
// IMPORTANT: This file must stay compatible with whatever UI code calls `authClient`.

import { sentinelClient } from "@better-auth/infra/client";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

// NOTE: côté client, BetterAuth n'a pas besoin de Prisma adapter.
// Les cookies + endpoints BetterAuth s'occupent du reste.
// Si tes UI utilisent déjà `authClient.signIn.*`, `signUp.*`, `signOut()` etc,
// cette instance doit exister.

const baseURL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000";

export const authClient = betterAuth({
  baseURL,
  // BetterAuth utilise le secret côté serveur pour signer; côté client on s'appuie sur l'API.
  // Certains projets nécessitent néanmoins la presence de BETTER_AUTH_SECRET côté client,
  // donc on évite de l'exiger ici.
  plugins: [nextCookies(), sentinelClient()],
});

