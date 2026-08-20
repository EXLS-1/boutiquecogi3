// app/admin/setup-2fa/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Copy, CheckCircle, AlertTriangle } from "lucide-react";

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
  let isMounted = true;

  fetch("/api/admin/2fa/setup")
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Erreur de chargement");
      }
      return res.json();
    })
    .then((data) => {
      if (isMounted && data.qrCode) {
        setQrCode(data.qrCode);
        setSecret(data.manualEntryKey);
      }
    })
    .catch((err) => {
      if (isMounted) {
        setError(err.message || "Impossible de charger la configuration 2FA");
      }
    });

  return () => {
    isMounted = false;
  };
}, []);

  const handleVerify = async () => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Vérification échouée");
      return;
    }

    setBackupCodes(data.backupCodes);
  };

  const copyCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Étape 2 : Backup codes affichés
  if (backupCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
        <Card className="w-full max-w-lg border-amber-500/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Codes de récupération</CardTitle>
            </div>
            <CardDescription className="text-neutral-400">
              Sauvegarde ces codes IMMÉDIATEMENT. Ils ne seront affichés qu&apos;une seule fois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((c, i) => (
                <div key={i} className="bg-neutral-900 p-2 rounded border border-neutral-800 text-center tracking-widest">
                  {c}
                </div>
              ))}
            </div>
            <Button onClick={copyCodes} variant="outline" className="w-full">
              {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copié !" : "Copier les codes"}
            </Button>
            <Button onClick={() => router.push("/admin")} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Accéder au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Étape 1 : Scan QR + Code TOTP
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <Card className="w-full max-w-md border-neutral-800">
        <CardHeader className="text-center">
          <Shield className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <CardTitle>Sécurisation du compte Super Admin</CardTitle>
          <CardDescription className="text-neutral-400">
            L&apos;authentification à deux facteurs est obligatoire pour ce rôle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {qrCode ? (
            <>
              <div className="flex flex-col items-center gap-4">
                <Image
                  src={qrCode}
                  alt="QR Code 2FA"
                  width={192}
                  height={192}
                  className="rounded-lg border border-neutral-800"
                />
                <div className="text-center space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Clé manuelle</p>
                  <code className="text-sm bg-neutral-900 px-2 py-1 rounded border border-neutral-800 select-all">
                    {secret}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  Code de vérification (6 chiffres)
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.5em] font-mono"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Activer le 2FA
              </Button>
            </>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
