// components/auth/sign-up-success.tsx
"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import toast from "sonner";
import { MailCheck, ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface SignUpSuccessProps {
  email?: string; // Optionnel : à extraire dynamiquement d'un état ou d'une query string
}

export default function SignedUp({ email = "votre boîte mail" }: SignUpSuccessProps) {
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Gestion du décompte du cooldown (anti-spam)
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      // Appel asynchrone réel vers l'instance de Better-Auth
      const { error } = await authClient.sendVerificationEmail({
        email: email === "votre boîte mail" ? "" : email,
        callbackURL: `${window.location.origin}/auth/sign-in`,
      });

      if (error) {
        throw new Error(error.message || "Impossible de renvoyer l'email.");
      }

      toast.success("Email de vérification renvoyé avec succès !");
      setCooldown(60); // Bloque le bouton pendant 60 secondes
    } catch (err: any) {
      toast.error(err.message || "Une erreur critique est survenue.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card className="border-t-4 border-t-cyan-600 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
              <MailCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              Vérifiez votre boîte mail
            </CardTitle>
            <CardDescription className="text-base text-balance mt-2">
              Un lien de confirmation a été envoyé à : <br />
              <span className="font-semibold text-slate-900 block mt-1 break-all">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-center text-sm text-muted-foreground leading-relaxed">
              Vous devez confirmer votre compte avant de pouvoir vous connecter.
              Pensez à vérifier vos courriers indésirables (spams).
            </p>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2 transition-all"
                onClick={handleResendEmail}
                disabled={isResending || cooldown > 0}
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                {isResending
                  ? "Envoi en cours..."
                  : cooldown > 0
                    ? `Renvoyer l'email (${cooldown}s)`
                    : "Renvoyer l'email de confirmation"
                }
              </Button>

              <Button variant="ghost" asChild className="w-full text-cyan-700 hover:text-cyan-800">
                <Link href="/auth/sign-in" className="flex items-center gap-2 justify-center">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}