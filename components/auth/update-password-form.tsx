// components/auth/update-password-form.tsx
"use client";

import { useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { cn } from "@/lib/utils/utils";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Schéma Zod robuste avec confirmation
const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "8 caractères minimum requis.")
    .regex(/[A-Z]/, "Au moins une lettre majuscule requise.")
    .regex(/[0-9]/, "Au moins un chiffre requis."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"], // Cible l'erreur sur le champ de confirmation
});

interface UpdatePasswordFormProps extends ComponentPropsWithoutRef<"div"> {
  token: string;
}

export function UpdatePasswordForm({
  token,
  className,
  ...props
}: UpdatePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validation de la logique métier (Frontend)
    const validation = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setError({
        field: firstIssue?.path[0]?.toString(),
        message: firstIssue?.message || "Erreur de validation.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Exécution avec Better-Auth (le token est automatiquement géré s'il est dans l'URL,
      // mais on le passe explicitement quand il est fourni en prop pour les flux e-mail).
      const resetPassword = (
        authClient as unknown as Record<string, unknown>
      )["resetPassword"];

      if (typeof resetPassword !== "function") {
        throw new Error("Service de réinitialisation indisponible.");
      }

      const trimmedToken = token?.trim() ?? "";
      const { error: authError } = (await (
        resetPassword as (args: {
          newPassword: string;
          token?: string;
        }) => Promise<{
          data?: unknown;
          error?: { message?: string } | null;
        }>
      )({
        newPassword: validation.data.password,
        ...(trimmedToken.length > 0 ? { token: trimmedToken } : {}),
      })) ?? { error: null };

      if (authError) {
        throw new Error(authError.message || "La réinitialisation a échoué.");
      }

      // 3. Routage post-succès
      router.push("/protected"); // Ou '/login' selon ton flux UX
      router.refresh();

    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Le lien est invalide ou a expiré.";
      setError({ message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sécurisez votre compte</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe robuste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              
              {/* Champ Mot de passe */}
              <div className="grid gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={error?.field === "password" ? "border-red-500" : ""}
                />
              </div>

              {/* Champ Confirmation */}
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Répétez le mot de passe"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className={error?.field === "confirmPassword" ? "border-red-500" : ""}
                />
              </div>

              {/* Contrôle de visibilité */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-password"
                  checked={showPassword}
                  onCheckedChange={(checked) => setShowPassword(!!checked)}
                  disabled={isLoading}
                />
                <Label 
                  htmlFor="show-password" 
                  className="text-sm font-normal cursor-pointer select-none"
                >
                  Afficher les mots de passe
                </Label>
              </div>

              {/* Affichage global des erreurs */}
              {error && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-600">{error.message}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Application en cours..." : "Mettre à jour et se connecter"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}