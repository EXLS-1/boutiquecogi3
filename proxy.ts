import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/better-auth";

export async function proxy(request: NextRequest) {
    // 1. Récupération de la session via BetterAuth
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const { pathname } = request.nextUrl;
    const isAuthRoute = pathname.startsWith("/auth") || pathname.startsWith("/login");
    const isPublicRoute = pathname === "/";

    // 2. Protection des routes privées
    if (!session && !isAuthRoute && !isPublicRoute) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // 3. Redirection si l'utilisateur est déjà connecté
    if (session && isAuthRoute) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Exclut les fichiers statiques, images et API internes
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
    ],
};