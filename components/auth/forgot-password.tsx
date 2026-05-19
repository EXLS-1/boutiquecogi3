// components/auth/forgot-password.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/auth-client"; // Ajuste le chemin selon ton architecture
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Schéma de validation strict
const forgotPasswordSchema = z.object({
  email: z.string().email("Veuillez entrer une adresse email valide."),
});

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation Zod avant l'appel réseau (Optimisation)
    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    // Better-Auth retourne un objet avec data et error, il ne throw pas par défaut
    const { error: authError } = await authClient.forgetPassword({
      email: validation.data.email,
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message || "Une erreur est survenue lors de la demande.");
      return;
    }

    setSuccess(true);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Vérifiez votre boîte mail</CardTitle>
            <CardDescription>Les instructions ont été envoyées.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Si un compte est associé à cette adresse, vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Réinitialiser le mot de passe</CardTitle>
            <CardDescription>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading} // Verrouillage d'état
                  />
                </div>
                {error && <p className="text-sm font-medium text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Vous avez déjà un compte ?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Se connecter
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}