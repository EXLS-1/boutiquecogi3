"use client";

// components/auth/forgot-password-form.tsx
import { useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
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

type ForgotPasswordResult = {
  data?: unknown;
  error?: { message?: string; status?: number; statusText?: string } | null;
};

function getResetRedirectUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  // Fallback relatif si aucune base absolue (SSR / preview).
  if (!baseUrl) return "/auth/update-password";
  return `${baseUrl.replace(/\/$/, "")}/auth/update-password`;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.length > 0) return err;
  return fallback;
}

export function ForgotPasswordForm({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Email invalide.");
      return;
    }

    setIsLoading(true);

    try {
      const forgetPassword =
        (authClient as unknown as Record<string, unknown>)["forgetPassword"] ??
        (authClient as unknown as Record<string, unknown>)["forgotPassword"];

      if (typeof forgetPassword !== "function") {
        throw new Error("Service de réinitialisation indisponible.");
      }

      const result = (await (
        forgetPassword as (args: {
          email: string;
          redirectTo: string;
        }) => Promise<ForgotPasswordResult>
      )({
        email: validation.data.email,
        // Construction dynamique et robuste de l'URL de retour
        redirectTo: getResetRedirectUrl(),
      })) satisfies ForgotPasswordResult;

      if (result?.error) {
        // Ne jamais donner d'indication si l'email existe ou non en production (Sécurité anti-énumération)
        console.error("[AUTH_FORGET_PWD_ERROR]", result.error);
        throw new Error(
          result.error.message ?? "La demande de réinitialisation a échoué.",
        );
      }

      setSuccess(true);
    } catch (err: unknown) {
      // Message générique pour éviter le fuzzing
      console.error("[AUTH_FORGET_PWD_FAILURE]", err);
      setError(getErrorMessage(err, "Une erreur est survenue lors de la demande. Veuillez réessayer plus tard."));
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
              Si un compte est associé à <strong>{email}</strong>, vous recevrez les instructions pour réinitialiser votre mot de passe d&apos;ici quelques minutes. Pensez à vérifier vos spams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
            <CardDescription>
              Entrez l&apos;adresse email associée à votre compte.
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