// components/admin/admin-pin-gate.tsx
"use client";

/**
 * Gate de saisie du code PIN admin.
 *
 * - Champ unique (6 caractères alphanumériques + spéciaux)
 * - Masqué par défaut (type="password") → affiche ******
 * - Case à cocher "Afficher le code" pour révéler
 */

import { useState, useRef, useEffect } from "react";
import { verifyAdminPinAction } from "@/lib/pin/admin-pin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Eye, EyeOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AdminPinGateProps = {
  onVerified: () => void;
};

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function AdminPinGate({ onVerified }: AdminPinGateProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false); // ← Masqué par défaut
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limiter à 6 caractères
    if (value.length <= 6) {
      setPin(value);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      setError("Le code PIN doit contenir exactement 6 caractères");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await verifyAdminPinAction(pin);

    if (!result.success) {
      setError(result.error || "Code PIN incorrect");
      setPin("");
      inputRef.current?.focus();
    } else {
      onVerified();
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-cyan-200 bg-white p-8 shadow-lg">
        {/* En-tête */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Lock className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Vérification de sécurité
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Saisissez votre code PIN à 6 caractères pour accéder à l'administration
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ PIN unique */}
          <div className="space-y-2">
            <label
              htmlFor="pin-input"
              className="block text-sm font-medium text-slate-700"
            >
              Code PIN
            </label>
            <div className="relative">
              <Input
                id="pin-input"
                ref={inputRef}
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={handleChange}
                placeholder="******"
                maxLength={6}
                disabled={isLoading}
                autoComplete="off"
                className="h-12 text-center text-lg font-mono tracking-widest pr-10"
                aria-label="Code PIN à 6 caractères"
              />
              {/* Indicateur visuel du type */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPin ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Case à cocher "Afficher le code" */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-pin"
                checked={showPin}
                onCheckedChange={(checked) => setShowPin(checked === true)}
                disabled={isLoading}
              />
              <label
                htmlFor="show-pin"
                className="text-sm font-medium leading-none text-slate-600 cursor-pointer select-none"
              >
                Afficher le code
              </label>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-center text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}

          {/* Bouton */}
          <Button
            type="submit"
            disabled={isLoading || pin.length !== 6}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isLoading ? "Vérification..." : "Valider"}
          </Button>
        </form>

        {/* Info */}
        <p className="text-center text-xs text-slate-500">
          Le code est requis à chaque accès et après 5 min d'inactivité
        </p>
      </div>
    </div>
  );
}
