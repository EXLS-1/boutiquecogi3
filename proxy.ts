// proxy.ts
// ============================================
// EDGE AUTH PROXY — Gardien d'entrée léger pour Boutiquecogi3
// ============================================
// proxy.ts, conçue comme un gardien d'entrée léger et strict.
// Toute la logique métier RBAC (permissions, restrictions, niveaux, audit, quotas) est intentionnellement déléguée à votre système centralisé
// (server.ts / rbac.ts).
// Ce proxy ne connaît que deux états : session existante ou GUEST.
// Ce proxy est le SEUL point d'entrée Edge pour la sécurité réseau.
// Il est intentionnellement AGNOSTIQUE de la logique métier RBAC.
//
// RESPONSABILITÉS STRICTES :
//   1. Security Headers (universels, toutes les réponses)
//   2. Classification des routes (Public | Auth | Protected | Admin)
//   3. Vérification binaire de session (Authentifié / GUEST)
//   4. Redirects (legacy + préservation des query params + callbackUrl)
//
// DÉLÉGATION EXPLICITE :
//   • Rate Limiting     → middleware.ts (Upstash Redis)
//   • Permissions       → @/lib/auth/server.ts (guardPermission, etc.)
//   • Restrictions      → @/lib/auth/rbac.ts (resolveEffectiveRestrictions)
//   • Niveaux RBAC      → @/lib/auth/server.ts (guardMinLevel, guardAdmin)
//   • Audit & Quotas    → @/lib/auth/server.ts (logAudit, enforceQuota)
//   • Gestion des rôles → @/lib/auth/rbac.ts (normalizeRole, getRoleLevel)
//
// RÈGLE D'OR :
//   Le proxy ne connaît que deux états : "a une session" ou "GUEST".
//   Toute granularité (Level 1-7) est résolue en aval dans les
//   Server Components et Server Actions.

import { betterFetch } from "@better-fetch/fetch";
import type { Session, User } from "better-auth/types";
import { NextResponse, type NextRequest } from "next/server";

interface BetterAuthSessionResponse {
  session: Session;
  user: User;
}

// ═══════════════════════════════════════════
// SECTION 1: CONFIGURATION
// ═══════════════════════════════════════════

/** Headers de sécurité appliqués à TOUTES les réponses */
const SECURITY_HEADERS = {
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), vr=(), magnetometer=(), gyroscope=()",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
} as const;

/** Routes d'authentification (pages de login/register/recovery/2FA) */
const AUTH_ROUTES = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forget-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/two-factor",
  "/auth/2fa-challenge",
  "/auth/callback",
];

/** Routes protégées (nécessitent une session authentifiée) */
const PROTECTED_ROUTES = [
  "/checkout",
  "/profile",
  "/account",
  "/orders",
  "/wishlist",
];

/** Routes admin (nécessitent une session ; le RBAC détaillé est en aval) */
const ADMIN_ROUTES = [
  "/admin",
  "/admin/dashboard",
  "/admin/users",
  "/admin/roles",
  "/admin/settings",
  "/admin/analytics",
  "/admin/setup-2fa",
];

// ═══════════════════════════════════════════
// SECTION 2: UTILITAIRES
// ═══════════════════════════════════════════

/** Détermine la zone de sécurité d'un pathname */
function classifyRoute(pathname: string): "public" | "auth" | "protected" | "admin" {
  // Auth routes
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return "auth";
  }

  // Admin routes
  if (ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return "admin";
  }

  // Protected routes
  if (PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return "protected";
  }

  // Par défaut : public (le downstream RBAC protège les API sensibles)
  return "public";
}

/** Résout la session via Better-Auth (Edge-safe, zero Prisma) */
async function resolveSession(request: NextRequest): Promise<BetterAuthSessionResponse | null> {
  try {
    const { data } = await betterFetch<BetterAuthSessionResponse>("/api/auth/get-session", {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    return data ?? null;
  } catch {
    // Échec silencieux = traité comme GUEST
    return null;
  }
}

/** Construit une URL de redirection vers auth avec callbackUrl */
function buildAuthRedirect(request: NextRequest, path: string): URL {
  const url = new URL(path, request.nextUrl.origin);
  // Préservation des query params existants (sauf callbackUrl)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "callbackUrl") {
      url.searchParams.set(key, value);
    }
  });
  // Injection du callbackUrl si la route actuelle n'est pas une route auth
  const currentPath = request.nextUrl.pathname;
  if (!currentPath.startsWith("/auth")) {
    url.searchParams.set("callbackUrl", currentPath);
  }
  return url;
}

// ═══════════════════════════════════════════
// SECTION 3: PROXY PRINCIPAL
// ═══════════════════════════════════════════

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Phase 1: Security Headers (toujours appliqués) ───
  const response = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // ─── Phase 2: Redirects legacy ───
  if (pathname === "/sign-in" || pathname === "/login" || pathname === "/auth/login") {
    return NextResponse.redirect(buildAuthRedirect(request, "/auth/sign-in"));
  }
  if (pathname === "/sign-up" || pathname === "/register") {
    return NextResponse.redirect(buildAuthRedirect(request, "/auth/sign-up"));
  }

  // ─── Phase 3: Classification de la route ───
  const zone = classifyRoute(pathname);

  // Routes publiques : aucune vérification de session requise au proxy
  if (zone === "public") {
    return response;
  }

  // ─── Phase 4: Résolution lazy de la session ───
  // On ne résout la session QUE si la route n'est pas publique.
  // C'est l'optimisation clé : pas de fetch session pour les assets/public.
  const authSession = await resolveSession(request);
  const isAuthenticated = Boolean(authSession?.session?.userId || authSession?.user?.id);

  // ─── Phase 5: Auth Zone ───
  // Si l'utilisateur est déjà authentifié, inutile d'accéder aux pages de login.
  // On le redirige vers son callbackUrl ou son profil.
  if (zone === "auth" && isAuthenticated) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const redirectTarget =
      callbackUrl && !callbackUrl.startsWith("/auth") ? callbackUrl : "/profile";
    return NextResponse.redirect(new URL(redirectTarget, request.nextUrl.origin));
  }

  // ─── Phase 6: Protected & Admin Zones ───
  // Nécessitent une session. Si GUEST → redirect vers login.
  //
  // NOTE IMPORTANTE :
  //   La vérification fine (Level 1-6, permissions spécifiques, restrictions,
  //   quotas) est DÉLÉGUÉE aux Server Components via @/lib/auth/server.ts.
  //   Exemple : une page /admin/page.tsx appellera `await guardAdmin()`
  //   qui rejettera un USER (Level 6) même s'il a passé ce proxy.
  if ((zone === "protected" || zone === "admin") && !isAuthenticated) {
    return NextResponse.redirect(buildAuthRedirect(request, "/auth/sign-in"));
  }

  // ─── Phase 7: Pass-through ───
  // La requête est autorisée à passer. Le vrai RBAC métier
  // (guardAdmin, guardPermission, enforceQuota, withAudit, etc.)
  // est appliqué dans les Server Components / Server Actions en aval.
  return response;
}

// ═══════════════════════════════════════════
// SECTION 4: MATCHER
// ═══════════════════════════════════════════
// Exclusion stricte des assets statiques pour la performance.
// ═══════════════════════════════════════════

export const config = {
  matcher: [
    /*
     * Match all request paths except static files:
     * - _next/static (Next.js static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json
     * - Static assets: svg, png, jpg, jpeg, gif, webp, ico, css, js, fonts
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
