// components/auth/update-password-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/auth-client"; // Ajuste le chemin selon ton architecture
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

// Schéma de validation du mot de passe (Robustesse)
const updatePasswordSchema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation de la robustesse du mot de passe en local
    const validation = updatePasswordSchema.safeParse({ password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    // Better-Auth extrait automatiquement le token de l'URL pour valider le reset
    const { error: authError } = await authClient.resetPassword({
      newPassword: validation.data.password,
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message || "Impossible de mettre à jour le mot de passe. Le lien est peut-être expiré.");
      return;
    }

    // Redirection sécurisée après succès
    router.push("/protected");
    router.refresh(); // Force le rafraîchissement du router Next.js pour purger le cache client
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Veuillez entrer votre nouveau mot de passe ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <div className="flex items-center gap-2 mt-1">
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
                    Afficher le mot de passe
                  </Label>
                </div>
              </div>
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enregistrement..." : "Sauvegarder"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}