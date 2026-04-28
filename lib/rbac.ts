import { redirect } from "next/navigation";
import { getSession, SessionUser } from "@/lib/auth-client";

export type UserRole = "ADMIN" | "USER" | "GUEST";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: UserRole;
    image?: string;
  };
}

/**
 * Vérifie si l'utilisateur est authentifié
 * Retourne les informations de session ou null pour les invités
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const result: any = await getSession();
    if (!result || !result.user) return null;
    
    const user = result.user as SessionUser;
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || "USER",
        image: user.image || undefined,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Vérifie si l'utilisateur est un administrateur
 */
export function requireAdmin(session: AuthSession | null) {
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Vérifie si l'utilisateur est authentifié (User ou Admin)
 */
export function requireAuth(session: AuthSession | null) {
  if (!session?.user?.id) {
    redirect("/login");
  }
}

/**
 * Vérifie les permissions basées sur le rôle
 */
export function hasPermission(session: AuthSession | null, requiredRole: UserRole): boolean {
  if (!session?.user?.role) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    GUEST: 0,
    USER: 1,
    ADMIN: 2,
  };
  
  return roleHierarchy[session.user.role] >= roleHierarchy[requiredRole];
}

/**
 * Vérifie si l'utilisateur peut accéder au panier
 * - Admin: oui (accès complet)
 * - User: oui (accès à son propre panier)
 * - Guest: non (doit se connecter)
 */
export function canAccessCart(session: AuthSession | null): boolean {
  return session?.user?.role === "ADMIN" || session?.user?.role === "USER";
}

/**
 * Vérifie si l'utilisateur peut accéder aux favoris
 * - Admin: oui (accès complet)
 * - User: oui (accès à ses propres favoris)
 * - Guest: oui (accès limité via localStorage)
 */
export function canAccessWishlist(_session: AuthSession | null): boolean {
  // Guest peut accéder aux favoris via localStorage
  return true;
}

/**
 * Vérifie si l'utilisateur peut passer une commande
 * - Admin: oui
 * - User: oui
 * - Guest: non (doit se connecter)
 */
export function canCheckout(session: AuthSession | null): boolean {
  return session?.user?.role === "ADMIN" || session?.user?.role === "USER";
}

/**
 * Vérifie si l'utilisateur peut accéder au profil
 * - Admin: oui
 * - User: oui (son propre profil)
 * - Guest: non
 */
export function canAccessProfile(session: AuthSession | null): boolean {
  return session?.user?.role === "ADMIN" || session?.user?.role === "USER";
}