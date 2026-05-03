// /lib/auth/errors.ts
export function mapAuthError(error: unknown): string {
  if (!error) return "Erreur inconnue";

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    if (error.message.includes("Invalid credentials"))
      return "Email ou mot de passe incorrect";

    if (error.message.includes("already exists"))
      return "Compte déjà existant";

    return error.message;
  }

  return "Erreur inattendue";
}
