"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
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
  email?: string; // Optionnel : passer l'email depuis l'état global ou l'URL
}

export default function SignUpSuccess({ email = "votre boîte mail" }: SignUpSuccessProps) {
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    // Simulation / Appel API BetterAuth pour renvoyer le lien de vérification
    // const { data, error } = await authClient.sendVerificationEmail({ email });
    
    // Logique de feedback
    setTimeout(() => {
      toast.success("Email de vérification renvoyé !");
      setIsResending(false);
    }, 1500);
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
            <CardDescription className="text-base">
              Un lien de confirmation a été envoyé à : <br />
              <span className="font-semibold text-slate-900">{email}</span>
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
                className="w-full gap-2" 
                onClick={handleResendEmail}
                disabled={isResending}
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                {isResending ? "Envoi en cours..." : "Renvoyer l'email de confirmation"}
              </Button>
              
              <Button variant="ghost" asChild className="w-full text-cyan-700 hover:text-cyan-800">
                <Link href="/auth/login" className="flex items-center gap-2">
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