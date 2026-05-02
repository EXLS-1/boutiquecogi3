"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
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
import Link from "next/link";

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
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    await authClient.signUp.email(
      {
        name: data.name,
        email: data.email,
        password: data.password,
      },
      {
        onRequest: () => setIsPending(true),
        onSuccess: () => {
          toast.success("Inscription réussie ! Redirection...");
          // Remplace "signed-up-form" : On redirige simplement vers une route protégée ou la connexion
          router.push("/auth/signed-up-form"); 
          router.refresh(); 
        },
        onError: (ctx) => {
          setIsPending(false);
          toast.error(ctx.error.message || "Une erreur est survenue lors de l'inscription.");
        },
      }
    );
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-cyan-700">Inscription</CardTitle>
        <CardDescription>
          Créez un compte pour accéder à la plateforme.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              type="password"
              {...register("password")}
              disabled={isPending}
              className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.password && <span className="text-sm text-red-500">{errors.password.message}</span>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              disabled={isPending}
              className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.confirmPassword && <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>}
          </div>

          <Button type="submit" className="w-full hover:text-rose-700" disabled={isPending}>
            {isPending ? "Création du compte..." : "S'inscrire"}
          </Button>

          <div className="text-center text-sm text-cyan-400">
            Déjà un compte ?{" "}
            <Link
              href="/auth/login"
              className="text-cyan-500 underline underline-offset-4 hover:text-rose-700 dark:text-cyan-700"
            >
              Se connecter
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}