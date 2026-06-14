// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialisation du client Redis (utilise les variables d'environnement Upstash)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Configuration du Rate Limiter : 5 tentatives par tranche de 60 secondes par IP
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@boutiquecogi/ratelimit",
});

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // On cible spécifiquement les routes critiques d'authentification de Better-Auth
  if (
    pathname.startsWith("/api/auth/sign-in") ||
    pathname.startsWith("/api/auth/sign-up") ||
    pathname.startsWith("/api/auth/forget-password")
  ) {
    // Récupération de l'IP (gestion Cloudflare / Vercel / Local)
    const ip =
      request.ip ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";

    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      // Logging asynchrone de l'IP suspecte (non-bloquant pour la réponse)
      const auditData = {
        action: "RATE_LIMIT_EXCEEDED",
        ip,
        userAgent: request.headers.get("user-agent"),
        metadata: {
          path: pathname,
          limit,
          resetAt: new Date(reset).toISOString(),
        },
      };

      // On lance le fetch sans l'attendre (fire-and-forget) pour la performance
      fetch(new URL("/api/internal/audit", request.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.AUTH_SECRET || "",
        },
        body: JSON.stringify(auditData),
      }).catch((err) => console.error("Failed to send audit log", err));

      return new NextResponse(
        JSON.stringify({
          message: "Trop de requêtes. Votre IP est temporairement limitée.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        },
      );
    }
  }

  return NextResponse.next();
}

// Optimisation : Le middleware ne s'exécute que sur les routes API et Auth pour la performance
export const config = {
  matcher: ["/api/auth/:path*"],
};
