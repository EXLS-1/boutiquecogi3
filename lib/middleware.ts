import { nextAppMiddleware } from "better-auth/next-js";

export default nextAppMiddleware({
  // Routes accessibles à tout le monde (Guests)
  publicRoutes: ["/auth/login", "/auth/sign-up", "/auth/signed-up", "/"],

  // Logique de vérification personnalisée
  checkSession: async (session, request) => {
    const { pathname } = request.nextUrl;

    // 1. Protection de la zone ADMIN
    if (pathname.startsWith("/admin")) {
      if (!session || session.user.role !== "admin") {
        // Redirige vers le dashboard si l'utilisateur n'est pas admin
        return Response.redirect(new URL("/dashboard", request.url));
      }
    }

    // 2. Protection de la zone USER (App)
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings")) {
      if (!session) {
        return Response.redirect(new URL("/auth/login", request.url));
      }
    }

    return true; // Autorise l'accès
  },
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};