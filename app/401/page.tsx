// app/unauthorized/page.tsx
// Page d'erreur générique — affichée à la place du dashboard pour Level 6

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Home, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  const router = useRouter();

  useEffect(() => {
    console.warn("[SECURITY] Level 6 user blocked from dashboard");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/20 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Accès refusé
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Vous n&apos;avez pas les permissions nécessaires pour accéder à cette ressource.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette zone est réservée au personnel autorisé. Contactez l&apos;administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </p>
          <div className="p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="w-3 h-3" />
              <code>Code d&apos;erreur : 403_FORBIDDEN</code>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button onClick={() => router.push("/")} className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" />
            Accueil
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}