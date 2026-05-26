// app/auth/page.tsx
// Page d'index de l'authentification - redirige vers la page de connexion
import { redirect } from "next/navigation";

export default function AuthIndexPage() {
  redirect("/auth/sign-in");
}
