import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  let session = null;

  try {
    // 1. Interrogation HTTP de l'API BetterAuth (Compatible Edge)
    // On extrait l'URL de base et on transmet les cookies entrants
    const baseURL = process.env.BETTER_AUTH_URL || request.nextUrl.origin;
    const res = await fetch(`${baseURL}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (res.ok) {
      session = await res.json();
    }
  } catch (error) {
    console.error("Erreur de validation de session dans le proxy :", error);
    // En cas de panne de l'API, on sécurise par défaut en refusant la session
  }

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth") || pathname.startsWith("/login");
  const isPublicRoute = pathname === "/";

  // 2. Protection rigoureuse des routes
  if (!session && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 3. Empêcher la double authentification
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Le matcher exclut "/api", ce qui empêche une boucle infinie avec notre fetch
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};