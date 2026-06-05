// components/auth/forgot-password.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { cn } from "@/lib/utils/utils";
import { authClient } from "@/lib/auth/auth-client";
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

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await authClient.forgetPassword({
        email: validation.data.email,
        // Construction dynamique et robuste de l'URL de retour
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (authError) {
        // Ne jamais donner d'indication si l'email existe ou non en production (Sécurité anti-énumération)
        console.error("[AUTH_FORGET_PWD_ERROR]", authError);
        throw new Error(authError.message);
      }

      setSuccess(true);
    } catch (err: any) {
      // Message générique pour éviter le fuzzing
      setError("Une erreur est survenue lors de la demande. Veuillez réessayer plus tard.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Vérifiez votre boîte de réception</CardTitle>
            <CardDescription>
              Un lien sécurisé a été généré.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Si un compte est associé à <strong>{email}</strong>, vous recevrez les instructions pour réinitialiser votre mot de passe d'ici quelques minutes. Pensez à vérifier vos spams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
            <CardDescription>
              Entrez l'adresse email associée à votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Adresse Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@domaine.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {error && <p className="text-sm font-medium text-red-500">{error}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Traitement en cours..." : "Recevoir le lien de réinitialisation"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                <Link
                  href="/auth/sign-in"
                  className="text-cyan-600 hover:text-cyan-800 hover:underline underline-offset-4"
                >
                  Retour à la connexion
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}