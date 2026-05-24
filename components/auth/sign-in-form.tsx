// components/auth/sign-in-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth/auth-client";
import toast from "react-hot-toast";

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
        <CardTitle className="text-2xl text-cyan-700">Se connecter</CardTitle>
        <CardDescription>
          Entrez vos identifiants pour accéder à votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
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

          <Button type="submit" className="w-full text-xl hover:text-rose-700" disabled={isPending}>
            {isPending ? "La connexion est en cours..." : "Se connecter"}
          </Button>

          <div className="text-center text-sm text-cyan-400">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/sign-up" // Assurez-vous que cette route est correcte
              className="text-cyan-500 underline underline-offset-4 hover:text-rose-700 dark:text-cyan-700"
            >
              S'inscrire
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
