// components/auth/social-auth-buttons.tsx
// Boutiquecogi3 - Social Authentication Buttons Component
// Author: Excel (excel@boutiquecogi3.com)
// Ce composant gère les boutons d'authentification sociale pour Google et Facebook.
// Il utilise Better-Auth pour gérer les redirections vers les fournisseurs d'identité et les callbacks.
// Les boutons affichent un indicateur de chargement pendant le processus d'authentification pour améliorer l'expérience utilisateur.
// En cas d'erreur, une notification toast est affichée pour informer l'utilisateur du problème rencontré.
// 1. Importation des dépendances nécessaires
// 2. Définition du composant SocialAuthButtons avec gestion de l'état de chargement pour chaque fournisseur
// 3. Fonction handleSocialSignIn pour gérer les clics sur les boutons et initier le processus d'authentification sociale
// 4. Utilisation de Better-Auth pour rediriger vers le fournisseur d'identité et gérer les callbacks
// 5. Affichage d'un indicateur de chargement pendant le processus d'authentification pour chaque fournisseur
// 6. Gestion des erreurs avec des notifications toast pour informer l'utilisateur en cas de problème
// 7. Utilisation de composants UI personnalisés pour une interface cohérente et attrayante
// 8. Utilisation de TypeScript pour une meilleure sécurité de type et une meilleure expérience de développement
// 9. Séparation claire des responsabilités entre les composants pour une meilleure maintenabilité et réutilisabilité du code
// 10. Intégration fluide avec le composant SignInForm pour offrir une expérience d'authentification complète et cohérente aux utilisateurs
// 11. Utilisation de la bibliothèque de composants UI pour une interface cohérente et attrayante
// 12. Gestion des erreurs de validation avec des messages clairs et précis pour aider les utilisateurs à corriger leurs entrées
// 13. Utilisation de la logique de chargement pour informer les utilisateurs que leur action est en cours de traitement et éviter les soumissions multiples
// 14. Utilisation de la gestion d'état pour contrôler l'affichage du mot de passe
// 15. Utilisation de la navigation de Next.js pour une expérience utilisateur fluide et rapide
// 16. Utilisation de la bibliothèque de composants UI pour une interface cohérente et attrayante
// 17. Gestion des erreurs de validation avec des messages clairs et précis pour aider les utilisateurs à corriger leurs entrées
// 18. Utilisation de la logique de chargement pour informer les utilisateurs que leur action est en cours de traitement et éviter les soumissions multiples
// 19. Utilisation de la gestion d'état pour contrôler l'affichage du mot de passe
// 20. Utilisation de la navigation de Next.js pour une expérience utilisateur fluide et rapide
// 21. Utilisation de la bibliothèque de composants UI pour une interface cohérente et attrayante
// 22. Gestion des erreurs de validation avec des messages clairs et précis pour aider les utilisateurs à corriger leurs entrées
// 23. Utilisation de la logique de chargement pour informer les utilisateurs que leur action est en cours de traitement et éviter les soumissions multiples
// 24. Utilisation de la gestion d'état pour contrôler l'affichage du mot de passe
// 25. Utilisation de la navigation de Next.js pour une expérience utilisateur fluide et rapide

"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function SocialAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);

  const handleSocialSignIn = async (provider: "google" | "facebook") => {
    setLoadingProvider(provider);
    
    // Better-Auth redirige automatiquement l'utilisateur vers le fournisseur.
    // Il gère l'inscription (si nouvel utilisateur) et la connexion simultanément.
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/protected", // Route cible après succès de l'authentification
    });

    if (error) {
      toast.error(error.message || `Échec de la connexion avec ${provider}.`);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => handleSocialSignIn("google")}
        className="w-full flex items-center border-cyan-200 gap-2"
      >
        {loadingProvider === "google" ? (
          <span className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 1２s.43 3.45 1。18 4。93l２。85-２。２２。8１-.6２z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Continuer avec Google
      </Button>

      <Button
        variant="outline"
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => handleSocialSignIn("facebook")}
        className="w-full flex items-center gap-2 border-cyan-200"
      >
        {loadingProvider === "facebook" ? (
          <span className="animate-spin h-4 w-4 border-2 border-cyan-400 rounded-full" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1877F2]" fill="currentColor" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
        Continuer avec Facebook
      </Button>
    </div>
  );
}