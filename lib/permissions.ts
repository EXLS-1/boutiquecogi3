import { auth } from "./auth";
import { headers } from "next/headers";

export type Role = "admin" | "user" | "guest";

/**
 * Récupère le rôle de l'utilisateur actuel
 */
export async function getCurrentRole(): Promise<Role> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return "guest";
  // Better-Auth place le rôle dans session.user.role via le plugin admin
  return (session.user.role as Role) || "user";
}

/**
 * Vérification stricte pour les Server Actions ou Pages
 */
export async function validateRole(requiredRole: Role) {
  const role = await getCurrentRole();
  
  if (requiredRole === "admin" && role !== "admin") {
    return false;
  }
  
  if (requiredRole === "user" && role === "guest") {
    return false;
  }

  return true;
}