// app/admin/settings/pin/pin-management.tsx
"use client";

/**
 * Interface de gestion du PIN pour SUPER_ADMIN.
 *
 * - Afficher l'état actuel du PIN
 * - Créer/modifier le PIN
 * - Activer/désactiver le PIN
 */

import { useState, useEffect } from "react";
import {
  getPinInfoAction,
  createOrUpdatePinAction,
  enablePinAction,
  disablePinAction,
  type PinInfo,
} from "@/lib/pin/admin-pin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  ShieldOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function PinManagement() {
  const [pinInfo, setPinInfo] = useState<PinInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulaire création/modification
  const [showForm, setShowForm] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Etats pour afficher/masquer les PIN
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Rafraîchit l'état du PIN (utilisé après une action réussie)
  const loadPinInfo = async () => {
    try {
      const info = await getPinInfoAction();
      setPinInfo(info);
    } catch {
      // Erreur réseau/action → le composant affiche « Accès refusé »
      setPinInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial (pattern « fetch dans un effet » avec garde de montage)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const info = await getPinInfoAction();
        if (!cancelled) setPinInfo(info);
      } catch {
        if (!cancelled) setPinInfo(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateOrUpdate = async () => {
    if (pin.length !== 6) {
      setError("Le PIN doit contenir le nombre exact des caractères");
      return;
    }
    if (pin !== confirmPin) {
      setError("Les codes PIN ne correspondent pas");
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const result = await createOrUpdatePinAction(pin);

    if (!result.success) {
      setError(result.error || "Erreur lors de la création");
    } else {
      setSuccess(
        result.warning
          ? `PIN créé/modifié avec succès — ${result.warning}`
          : "PIN créé/modifié avec succès",
      );
      setShowForm(false);
      setPin("");
      setConfirmPin("");
      await loadPinInfo();
    }

    setActionLoading(false);
  };

  const handleEnable = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await enablePinAction();
      if (result.success) {
        setSuccess(result.warning ? `PIN activé — ${result.warning}` : "PIN activé");
        await loadPinInfo();
      } else {
        setError(result.error || "Erreur lors de l'activation du PIN");
      }
    } catch {
      setError("Erreur lors de l'activation du PIN");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    if (
      !confirm(
        "Désactiver le code PIN ? L&apos;administrateurs n&apos;aura plus besoin de saisir le code.",
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await disablePinAction();
      if (result.success) {
        setSuccess(
          result.warning ? `PIN désactivé — ${result.warning}` : "PIN désactivé",
        );
        await loadPinInfo();
      } else {
        setError(result.error || "Erreur lors de la désactivation du PIN");
      }
    } catch {
      setError("Erreur lors de la désactivation du PIN");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!pinInfo) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="py-6">
          <p className="text-rose-600">Accès refusé. Réservé au SUPER_ADMIN.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* État actuel */}
      <Card className="border-cyan-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-800">État actuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Statut</p>
              <p className="text-sm text-slate-500">
                {pinInfo.enabled ? "PIN activé" : "PIN désactivé"}
              </p>
            </div>
            {pinInfo.enabled ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                Actif
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Inactif
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Configuration</p>
              <p className="text-sm text-slate-500">
                {pinInfo.configured ? "PIN configuré" : "Aucun PIN configuré"}
              </p>
            </div>
          </div>

          {pinInfo.updatedAt && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Dernière modification</p>
                <p className="text-sm text-slate-500">
                  {new Date(pinInfo.updatedAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {success && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">
              {success}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-cyan-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-800">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showForm ? (
            <div className="flex flex-wrap gap-3">
              {/* Créer / modifier le PIN */}
              <Button
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setShowForm(true);
                }}
                className="bg-cyan-600 text-white hover:bg-cyan-700"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {pinInfo.configured ? "Modifier le PIN" : "Créer le PIN"}
              </Button>

              {/* Activer / désactiver le PIN */}
              {pinInfo.configured &&
                (pinInfo.enabled ? (
                  <Button
                    variant="outline"
                    onClick={handleDisable}
                    disabled={actionLoading}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldOff className="mr-2 h-4 w-4" />
                    )}
                    Désactiver le PIN
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleEnable}
                    disabled={actionLoading}
                    className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Activer le PIN
                  </Button>
                ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Champ PIN */}
              <div className="space-y-2">
                <label
                  htmlFor="new-pin"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nouveau code PIN (6 caractères)
                </label>
                <div className="relative">
                  <Input
                    id="new-pin"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="******"
                    maxLength={6}
                    autoComplete="new-password"
                    className="text-center text-lg font-mono tracking-widest pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPin ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-new-pin"
                    checked={showPin}
                    onCheckedChange={(checked) => setShowPin(checked === true)}
                  />
                  <label
                    htmlFor="show-new-pin"
                    className="text-sm text-slate-600 cursor-pointer select-none"
                  >
                    Afficher le code
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  6 caractères : alphanumériques + au moins un caractère spécial
                </p>
              </div>

              {/* Champ confirmation */}
              <div className="space-y-2">
                <label
                  htmlFor="confirm-new-pin"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirmer le code PIN
                </label>
                <div className="relative">
                  <Input
                    id="confirm-new-pin"
                    type={showConfirmPin ? "text" : "password"}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="******"
                    maxLength={6}
                    autoComplete="new-password"
                    className="text-center text-lg font-mono tracking-widest pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showConfirmPin ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-confirm-pin"
                    checked={showConfirmPin}
                    onCheckedChange={(checked) => setShowConfirmPin(checked === true)}
                  />
                  <label
                    htmlFor="show-confirm-pin"
                    className="text-sm text-slate-600 cursor-pointer select-none"
                  >
                    Afficher le code
                  </label>
                </div>
              </div>

              {/* Messages */}
              {error && <p className="text-sm text-rose-600">{error}</p>}

              {/* Boutons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setPin("");
                    setConfirmPin("");
                    setError(null);
                    setShowPin(false);
                    setShowConfirmPin(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={pin.length !== 6 || confirmPin.length !== 6 || actionLoading}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {pinInfo.configured ? "Modifier" : "Créer"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}