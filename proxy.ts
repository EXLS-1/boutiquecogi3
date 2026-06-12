// proxy.ts

import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextResponse, type NextRequest } from "next/server";

// Liste centralisée des routes sécurisées
const PROTECTED_PREFIXES = [
  "/checkout",
  "/profile",
  "/dashboard",
  "/account",
  "/admin",
  "/protected",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Redirection de l'ancienne route /sign-in avec préservation des paramètres
  if (pathname === "/sign-in") {
    const url = new URL("/auth/sign-in", request.nextUrl.origin);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url);
  }

  const isAuthRoute = pathname.startsWith("/auth");
  const needsAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  // 2. Optimisation de performance : On ignore le proxy si la route n'est ni protégée ni d'authentification
  if (!needsAuth && !isAuthRoute) {
    return NextResponse.next();
  }

  // 3. Interrogation de la session via HTTP (Compatible Edge & Prisma)
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );

  // 4. Bloquer l'accès aux routes protégées et injecter le callbackUrl
  if (!session && needsAuth) {
    const loginUrl = new URL("/auth/sign-in", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Bloquer l'accès aux pages de connexion pour les utilisateurs déjà authentifiés
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/profile", request.nextUrl.origin));
  }

  return NextResponse.next();
}

// 6. Matcher strict pour éviter l'exécution du proxy sur les assets (_next/static, images, etc.)
export const config = {
  matcher: [
    "/sign-in",
    "/auth/:path*",
    "/checkout/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
