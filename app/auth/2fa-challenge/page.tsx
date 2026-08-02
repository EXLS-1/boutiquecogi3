"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, KeyRound, AlertTriangle } from "lucide-react";

export default function TwoFAChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBackup, setIsBackup] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Vérification échouée");
      return;
    }

    // Succès → redirection admin
    router.push("/admin");
    router.refresh();
  };

  const maxLength = isBackup ? 8 : 6;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <Card className="w-full max-w-md border-neutral-800 bg-neutral-900">
        <CardHeader className="text-center">
          <Shield className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <CardTitle className="text-white">Authentification à deux facteurs</CardTitle>
          <CardDescription className="text-neutral-400">
            {isBackup
              ? "Entre un code de secours à usage unique"
              : "Entre le code généré par ton application d'authentification"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-md text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              type="text"
              inputMode="alphanumeric"
              maxLength={maxLength}
              placeholder={isBackup ? "ABCD1234" : "000000"}
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, maxLength)
                )
              }
              className="text-center text-xl tracking-[0.4em] font-mono bg-neutral-950 border-neutral-800 h-14"
              autoFocus
            />

            <Button
              onClick={handleVerify}
              disabled={code.length !== maxLength || loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Vérifier et accéder
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsBackup(!isBackup);
                setCode("");
                setError("");
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <KeyRound className="h-3 w-3" />
              {isBackup ? "Utiliser le code TOTP à 6 chiffres" : "Utiliser un code de secours"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
