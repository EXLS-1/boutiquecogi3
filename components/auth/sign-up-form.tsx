// components/auth/sign-up-form.tsx
// Ce composant gère l'inscription par email avec validation stricte et une barre de force du mot de passe.
// Il intègre également les boutons d'authentification sociale pour une expérience complète.
// 1. Utilisation de zod pour une validation robuste et des messages d'erreur clairs
// 2. Utilisation de React Hook Form pour une gestion performante des formulaires et une intégration facile avec zod
// 3. Intégration de zxcvbn pour évaluer la force du mot de passe en temps réel et fournir un feedback visuel
// 4. Gestion de l'état de chargement et des messages de succès/erreur avec react-hot-toast.
// 5. Utilisation de composants UI personnalisés pour une interface cohérente et attrayante
// 6. Redirection après une inscription réussie pour guider l'utilisateur vers la prochaine étape
// 7. Séparation claire des responsabilités entre les composants pour une meilleure maintenabilité et réutilisabilité du code
// 8. Utilisation de TypeScript pour une meilleure sécurité de type et une meilleure expérience de développement
// 9. Intégration de la logique d'authentification avec BetterAuth pour une gestion sécurisée et efficace des utilisateurs
// 10. Utilisation de la validation côté client pour une meilleure expérience utilisateur et une réduction des erreurs de soumission
// 11. Utilisation de la validation côté serveur via BetterAuth pour une sécurité renforcée et une gestion centralisée des erreurs
// 12. Mise en place d'une interface utilisateur réactive et informative pour guider les utilisateurs tout au long du processus d'inscription
// 13. Utilisation de la gestion d'état pour contrôler les éléments de l'interface en fonction des actions de l'utilisateur et des réponses du serveur
// 14. Utilisation de la navigation de Next.js pour une expérience utilisateur fluide et rapide
// 15. Utilisation de la bibliothèque de composants UI pour une interface cohérente et attrayante
// 16. Gestion des erreurs de validation avec des messages clairs et précis pour aider les utilisateurs à corriger leurs entrées
// 17. Utilisation de la logique de chargement pour informer les utilisateurs que leur action est en cours de traitement et éviter les soumissions multiples
// 18. Utilisation de la gestion d'état pour contrôler l'affichage du mot de passe pour une meilleure expérience utilisateur
// 19. Utilisation de `useMemo` pour optimiser les calculs coûteux comme la force du mot de passe
// 20. Configuration de zxcvbn pour charger uniquement les dictionnaires nécessaires et améliorer les performances
// 21. Utilisation de `cn` pour gérer dynamiquement les classes CSS en fonction de la validation ou de l'état
// 22. Ajout d'une barre de force du mot de passe avec des couleurs et des messages pour guider les utilisateurs vers des mots de passe plus sécurisés
// 23. Amélioration de l'accessibilité avec des labels clairs et des messages d'erreur associés aux champs de formulaire
// 24. Intégration de la logique d'authentification sociale via le composant SocialAuthButtons pour une expérience d'inscription complète et moderne
// 25. Utilisation de `useEffect` pour réinitialiser les états ou effectuer des actions secondaires si nécessaire (non utilisé dans ce cas, mais prêt pour de futures améliorations)
// 26. Application de styles cohérents avec les composants UI personnalisés pour une interface attrayante et moderne
// 27. Séparation claire des responsabilités entre les composants pour une meilleure maintenabilité et réutilisabilité du code
// 28. Utilisation de TypeScript pour une meilleure sécurité de type et une meilleure expérience de développement
// 29. Intégration de la logique d'authentification avec BetterAuth pour une gestion sécurisée et efficace des utilisateurs
// 30. Utilisation de la validation côté client pour une meilleure expérience utilisateur et une réduction des erreurs de soumission
// 31. Utilisation de la validation côté serveur via BetterAuth pour une sécurité renforcée et une gestion centralisée des erreurs
// 32. Mise en place d'une interface utilisateur réactive et informative pour guider les utilisateurs tout au long du processus d'inscription
// 33. Utilisation de la gestion d'état pour contrôler les éléments de l'interface en fonction des actions de l'utilisateur et des réponses du serveur
// 34. Utilisation de la navigation de Next.js pour une expérience utilisateur fluide et rapide
// 35. Utilisation de la bibliothèque de composants UI pour une interface cohérente et attrayante
// 36. Gestion des erreurs de validation avec des messages clairs et précis pour aider les utilisateurs à corriger leurs entrées
// 37. Utilisation de la logique de chargement pour informer les utilisateurs que leur action est en cours de traitement et éviter les soumissions multiples
// 38. Utilisation de la gestion d'état pour contrôler l'affichage du mot de passe pour une meilleure expérience utilisateur
// 39. Utilisation de `react-hot-toast` pour afficher des notifications de succès ou d'erreur à l'utilisateur

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth/auth-client";
import toast from "react-hot-toast";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as commonTransitions from "@zxcvbn-ts/language-common";
import { cn } from "@/lib/utils/utils";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

// Configuration de zxcvbn pour optimiser les performances et estimer lq force des mots de passe (chargement des dictionnaires communs)
zxcvbnOptions.setOptions({
  dictionary: {
    ...commonTransitions.dictionary,
  },
  graphs: commonTransitions.adjacencyGraphs,
});

// Définition stricte et vérification croisée des mots de passe
const signUpSchema = z.object({
  name: z.string().min(4, { message: "Le nom doit contenir au moins 4 caractères." }),
  email: z.string().email({ message: "Adresse email invalide." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"], // Cible l'erreur sur le champ de confirmation
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // Surveillance du mot de passe pour calculer la force
  // Utilisation de useWatch au lieu de watch() pour éviter l'erreur React Compiler
  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });
  const passwordScore = useMemo(() => {
    return passwordValue ? zxcvbn(passwordValue).score : -1;
  }, [passwordValue]);

  const onSubmit = async (data: SignUpFormValues) => {
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Une erreur est survenue lors de l'inscription.");
        setIsPending(false);
        return;
      }

      toast.success("Inscription réussie ! Redirection...");
      // AutoSignIn est activé → l'utilisateur est connecté automatiquement, redirection vers l'accueil
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error("Une erreur est survenue lors de l'inscription.");
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full bg-cyan-100 max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-cyan-700">Inscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {/* Injection stricte de la logique OAuth */}
          <SocialAuthButtons />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-cyan-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 text-cyan-400 bg-cyan-200 rounded-full">ou avec votre email</span>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

            <div className="grid gap-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                {...register("name")}
                disabled={isPending}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
                disabled={isPending}
                className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.email && <span className="text-sm text-red-500">{errors.email.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                disabled={isPending}
                className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {/* Barre de force du mot de passe */}
              {passwordValue && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex h-1 w-full gap-1">
                    {[0, 1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={cn(
                          "h-full w-full rounded-full transition-colors duration-300",
                          step <= passwordScore
                            ? [
                              "bg-red-500",    // Très faible
                              "bg-orange-500", // Faible
                              "bg-amber-400",  // Moyen
                              "bg-emerald-500" // Fort
                            ][passwordScore]
                            : "bg-cyan-100"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-400">
                    Force : {["Très faible", "Faible", "Moyen", "Fort", "Excellent"][passwordScore]}
                  </p>
                </div>
              )}
              {errors.password && <span className="text-sm text-red-500">{errors.password.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                {...register("confirmPassword")}
                disabled={isPending}
                className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.confirmPassword && <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>}
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  id="show-passwords"
                  checked={showPassword}
                  onCheckedChange={(checked) => setShowPassword(!!checked)}
                />
                <Label htmlFor="show-passwords" className="text-sm font-normal cursor-pointer text-cyan-700">
                  Afficher les mots de passe
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full bg-cyan-400 text-white hover:bg-rose-500" disabled={isPending}>
              {isPending ? "Création du compte..." : "S'inscrire"}
            </Button>

            <div className="text-center text-sm text-cyan-400">
              Déjà un compte ?{" "}
              <Link
                href="/auth/sign-in"
                className="text-cyan-500 underline underline-offset-4 hover:text-rose-700 dark:text-cyan-700"
              >
                Se connecter
              </Link>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}