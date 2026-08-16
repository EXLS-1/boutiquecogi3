// components/auth/sign-up-form.tsx

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as commonTransitions from "@zxcvbn-ts/language-common";
import Link from "next/link";

import { authClient } from "@/lib/auth/auth-client";
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

zxcvbnOptions.setOptions({
  dictionary: { ...commonTransitions.dictionary },
  graphs: commonTransitions.adjacencyGraphs,
});

const signUpSchema = z.object({
  name: z.string().trim().min(4, { message: "Le nom doit contenir au moins 4 caractères." }),
  email: z.string().trim().email({ message: "Adresse email invalide." }),
  password: z.string().min(8, { message: "Minimum 8 caractères requis." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // Limiter useWatch STRICTEMENT au mot de passe pour zxcvbn
  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });
  const passwordScore = useMemo(() => (passwordValue ? zxcvbn(passwordValue).score : -1), [passwordValue]);

  const onSubmit = async (data: SignUpFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (error) {
        setErrorMessage(error.message || "Une erreur est survenue lors de l'inscription.");
        return;
      }

      setSuccessMessage("Inscription réussie ! Redirection...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000); // 2 secondes suffisent, 5 secondes créent de la frustration
    } catch (err) {
      console.error("[AUTH_SIGNUP_ERROR]", err);
      setErrorMessage("Erreur réseau. Veuillez réessayer.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl bg-cyan-100">
      <CardHeader>
        <CardTitle className="text-2xl text-cyan-700">Inscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <SocialAuthButtons />

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-cyan-200" />
            </div>
            <div className="relative px-2 py-0.5 text-xs text-cyan-700 bg-cyan-200 rounded-full">
              ou avec votre email
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                disabled={isSubmitting || !!successMessage}
                aria-invalid={!!errors.name}
                {...register("name")}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.name && <span className="text-xs text-red-600" role="alert">{errors.name.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isSubmitting || !!successMessage}
                aria-invalid={!!errors.email}
                {...register("email")}
                className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.email && <span className="text-xs text-red-600" role="alert">{errors.email.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting || !!successMessage}
                aria-invalid={!!errors.password}
                {...register("password")}
                className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {passwordValue && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex h-1 w-full gap-1">
                    {[0, 1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={cn(
                          "h-full w-full rounded-full transition-colors duration-300",
                          step <= passwordScore
                            ? ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500"][passwordScore]
                            : "bg-cyan-200"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-700">
                    Force : {["Très faible", "Faible", "Moyen", "Fort", "Excellent"][passwordScore + 1] || "Très faible"}
                  </p>
                </div>
              )}
              {errors.password && <span className="text-xs text-red-600" role="alert">{errors.password.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting || !!successMessage}
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.confirmPassword && <span className="text-xs text-red-600" role="alert">{errors.confirmPassword.message}</span>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-passwords"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(!!checked)}
                disabled={isSubmitting || !!successMessage}
              />
              <Label htmlFor="show-passwords" className="text-sm font-normal cursor-pointer text-cyan-800">
                Afficher les mots de passe
              </Label>
            </div>

            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="alert">
                {successMessage}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:cursor-not-allowed"
              disabled={!isValid || isSubmitting || !!successMessage}
            >
              {isSubmitting ? "Inscription en cours..." : "S'inscrire"}
            </Button>

            <div className="text-center text-sm text-cyan-700">
              Déjà un compte ?{" "}
              <Link
                href="/auth/sign-in"
                className="font-medium underline underline-offset-4 hover:text-cyan-900"
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
