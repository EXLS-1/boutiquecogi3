// components/auth/sign-in-form.tsx
// 1. Importation des dépendances nécessaires
// 2. Définition du schéma de validation avec Zod
// 3. Création du composant SignInForm avec gestion de l'état et des erreurs
// 4. Intégration de BetterAuth pour la connexion email/password et les redirections
// 5. Ajout de boutons pour les connexions sociales (Google, Facebook) via le composant SocialAuthButtons
// 6. Utilisation de composants UI personnalisés pour une meilleure expérience utilisateur
// 7. Gestion des erreurs et des états de chargement pour une interface réactive et informative
// 8. Redirection vers la page d'inscription pour les nouveaux utilisateurs
// 9. Redirection vers la page de mot de passe oublié pour les utilisateurs ayant des problèmes de connexion
// 10. Utilisation de toast pour les notifications de succès et d'erreur
// 11. Optimisation des performances avec React Hook Form et Zod pour une validation rapide et efficace
// 12. Utilisation de Next.js pour la navigation et les liens internes
// 13. Application de styles cohérents avec les composants UI personnalisés pour une interface attrayante et moderne
// 14. Gestion de l'affichage du mot de passe pour une meilleure expérience utilisateur
// 15. Séparation claire des responsabilités entre les composants pour une meilleure maintenabilité et réutilisabilité du code
// 16. Utilisation de TypeScript pour une meilleure sécurité de type et une meilleure expérience de développement
// 17. Intégration de la logique d'authentification avec BetterAuth pour une gestion sécurisée et efficace des utilisateurs
// 18. Utilisation de la validation côté client pour une meilleure expérience utilisateur et une réduction des erreurs de soumission
// 19. Utilisation de la validation côté serveur via BetterAuth pour une sécurité renforcée et une gestion centralisée des erreurs
// 20. Mise en place d'une interface utilisateur réactive et informative pour guider les utilisateurs tout au long du processus de connexion
// 21. Utilisation de la gestion d'état pour contrôler les éléments de l'interface en fonction des actions de l'utilisateur et des réponses du serveur
// 22. Utilisation de la navigation de Next.js pour une expérience utilisateur fluide et rapide
// 23. Utilisation de la bibliothèque de composants UI pour une interface cohérente et attrayante
// 24. Gestion des erreurs de validation avec des messages clairs et précis pour aider les utilisateurs à corriger leurs entrées
// 25. Utilisation de la logique de chargement pour informer les utilisateurs que leur action est en cours de traitement et éviter les soumissions multiples
// 26. Utilisation de la gestion d'état pour contrôler l'affichage du mot de passe

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth/auth-client";
import toast from "react-hot-toast";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

// 1. Définition stricte du schéma de validation
const signinSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide." }),
  password: z.string().min(6, { message: "Le mot de passe est requis." }),
});

type SignInFormValues = z.infer<typeof signinSchema>;

export function SignInForm() {
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // 2. Initialisation de React Hook Form pour la performance et la validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  // 3. Gestion de la soumission avec l'API BetterAuth (via callbacks pour la fiabilité)
  const onSubmit = async (data: SignInFormValues) => {
    await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
      },
      {
        onRequest: () => {
          setIsPending(true);
        },
        onSuccess: () => {
          toast.success("Connexion réussie !");
          router.push("/");
          router.refresh();
        },
        onError: (ctx) => {
          setIsPending(false);
          toast.error(ctx.error.message || "Identifiants incorrects.");
        },
      }
    );
  };

  return (
    <Card className="w-full bg-cyan-100 max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-cyan-700">Connexion</CardTitle>
        
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <SocialAuthButtons />

          <div className="relative items-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-cyan-200" />
            </div>
            <div className="relative flex items-center justify-center text-xs">
              <span className="px-2 text-cyan-400 bg-cyan-200 rounded-full">ou avec votre email</span>
            </div>
          </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="grid bg-cyan-100 gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email-signin"
              type="email"
              placeholder="votre_email@example.com"
              {...register("email")}
              disabled={isPending} // Désactivation pendant le chargement
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.email && (
              <span className="text-sm text-red-500">{errors.email.message}</span>
            )}
          </div>

          <div className="grid gap-2 bg-cyan-100">
            <div className="flex items-center bg-cyan-100 justify-between">
              <Label htmlFor="password-signin">Mot de passe</Label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-cyan-400 underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password-signin"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              disabled={isPending}
              className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.password && (
              <span className="text-sm text-red-500">{errors.password.message}</span>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Checkbox
                id="show-password"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(!!checked)}
              />
              <Label htmlFor="show-password" className="text-sm font-normal cursor-pointer text-cyan-700">
                Afficher le mot de passe
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full bg-cyan-400 text-white hover:bg-rose-500" disabled={isPending}>
            {isPending ? "La connexion est en cours..." : "Se connecter"}
          </Button>

          <div className="text-center text-sm text-cyan-400">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/sign-up"
              className="text-cyan-400 underline underline-offset-4 hover:text-rose-700 dark:text-cyan-700"
            >
              S'inscrire
            </Link>
          </div>
        </form>
        </div>
      </CardContent>
    </Card>
  );
}
