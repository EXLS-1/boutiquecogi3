// components/auth/sign-in-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";

import { authClient } from "@/lib/auth/auth-client";
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

const signinSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
});

type SignInFormValues = z.infer<typeof signinSchema>;

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signinSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  // Nettoyage impératif au chargement/rafraîchissement de la page
  useEffect(() => {
    reset({ email: "", password: "" });
  }, [reset]);

  const checkRequires2FA = async (): Promise<boolean> => {
    const statusRes = await fetch("/api/auth/2fa/status", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!statusRes.ok) {
      throw new Error("Impossible de vérifier le statut 2FA.");
    }

    const data = await statusRes.json();
    return Boolean(data?.requires2FA);
  };

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (data: SignInFormValues) => {
    if (cooldown > 0) return;

    try {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // En cas d'échec, vidage sécurisé du mot de passe
        reset({ email: data.email, password: "" });

        if (error.status === 429) {
          startCooldown(60);
          toast.error("Trop de tentatives. Veuillez patienter 60 secondes.", { duration: 5000 });
          return;
        }

        toast.error(error.message || "Email ou mot de passe incorrect.", { duration: 5000 });
        return;
      }

      const requires2FA = await checkRequires2FA();

      toast.success("Connexion réussie !", { duration: 5000 });
      reset({ email: "", password: "" });

      if (requires2FA) {
        router.push("/auth/2fa-challenge");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("[AUTH_SIGNIN_ERROR]", err);
      reset({ email: "", password: "" });
      toast.error(
        err instanceof Error ? err.message : "Une erreur réseau est survenue.",
        { duration: 5000 }
      );
    }
  };

  const isFormDisabled = isSubmitting || cooldown > 0;

  return (
    <Card className="w-full max-w-sm shadow-xl bg-cyan-100">
      <CardHeader>
        <CardTitle className="text-2xl text-cyan-700">Connexion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <SocialAuthButtons />

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-cyan-200" />
            </div>
            <div className="relative text-xs bg-cyan-200 px-2 py-0.5 rounded-full text-cyan-700">
              ou avec votre email
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
            autoComplete="off"
          >
            <div className="grid gap-2">
              <Label htmlFor="email-signin">Email</Label>
              <Input
                id="email-signin"
                type="email"
                autoComplete="off"
                placeholder="votre_email@example.com"
                disabled={isFormDisabled}
                aria-invalid={!!errors.email}
                {...register("email")}
                className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.email && (
                <span className="text-xs text-red-600" role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password-signin">Mot de passe</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-cyan-600 underline-offset-4 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input
                id="password-signin"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isFormDisabled}
                aria-invalid={!!errors.password}
                {...register("password")}
                className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.password && (
                <span className="text-xs text-red-600" role="alert">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-password"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(!!checked)}
                disabled={isFormDisabled}
              />
              <Label
                htmlFor="show-password"
                className="text-sm font-normal cursor-pointer text-cyan-800"
              >
                Afficher le mot de passe
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:cursor-not-allowed"
              disabled={!isValid || isFormDisabled}
            >
              {isSubmitting
                ? "Connexion en cours..."
                : cooldown > 0
                  ? `Réessayer dans ${cooldown}s`
                  : "Se connecter"}
            </Button>

            <div className="text-center text-sm text-cyan-700">
              Pas encore de compte ?{" "}
              <Link
                href="/auth/sign-up"
                className="font-medium underline underline-offset-4 hover:text-cyan-900"
              >
                S&apos;inscrire
              </Link>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
