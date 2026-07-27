// components/auth/delete-account-section.tsx
// ============================================
// Composable de suppression de compte utilisateur
// ============================================
// Processus en 3 étapes :
//   1. Avertissement — Liste les conséquences et demande confirmation
//   2. Saisie — Raison + mot de passe
//   3. Confirmation finale avec chronomètre (attente 5s)
//
// Sécurité :
//   - Validation Zod côté client ET serveur
//   - Vérification du mot de passe via BetterAuth
//   - Confirmation explicite par checkbox obligatoire
//   - Rate limiting via désactivation temporaire après soumission
// ============================================

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMyAccountAction } from "@/server/actions/account-self-actions";
import { selfDeleteAccountSchema } from "@/lib/validations/account";

// ─── UI Shadcn ──────────────────────────────
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// ─── Icons ──────────────────────────────────
import {
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Clock,
  Loader2,
  CheckCircle2,
  UserX,
  ArrowLeft,
  KeyRound,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

type Step = "warning" | "form" | "confirming" | "submitted";

interface ActionResult {
  success: boolean;
  error?: string;
  code?: string;
  message?: string;
  data?: {
    message?: string;
    deletedAt?: string;
    registryId?: string;
    anonymizedEmail?: string;
  };
}

// ═══════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════

const CONFIRMATION_DELAY_SECONDS = 5;

const CONSEQUENCES = [
  {
    icon: UserX,
    title: "Compte désactivé",
    description:
      "Vous ne pourrez plus vous connecter avec cette adresse email.",
  },
  {
    icon: ShieldAlert,
    title: "Données anonymisées",
    description:
      "Votre nom et email seront remplacés par des identifiants anonymes.",
  },
  {
    icon: FileText,
    title: "Registre interne conservé",
    description:
      "Un snapshot de vos données est conservé dans notre registre à des fins légales et de traçabilité.",
  },
  {
    icon: Clock,
    title: "Action irréversible",
    description:
      "Cette suppression est définitive et irréversible. Aucune restauration n'est possible sans contacter l'administration.",
  },
];

// ═══════════════════════════════════════════
// COMPOSANTS INTERNES
// ═══════════════════════════════════════════

function ConsequenceItem({
  icon: Icon,
  title,
  description,
}: (typeof CONSEQUENCES)[number]) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="mt-0.5 shrink-0 rounded-full bg-red-100 p-1.5">
        <Icon className="h-4 w-4 text-red-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════

export function DeleteAccountSection() {
  const router = useRouter();

  // ── État des étapes ──
  const [step, setStep] = useState<Step>("warning");
  const [open, setOpen] = useState(false);

  // ── État du formulaire ──
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // ── État de soumission ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(CONFIRMATION_DELAY_SECONDS);
  const [canConfirm, setCanConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  // ── Chronomètre de confirmation ──
  useEffect(() => {
    if (step !== "confirming") {
      setCountdown(CONFIRMATION_DELAY_SECONDS);
      setCanConfirm(false);
      return;
    }

    if (countdown <= 0) {
      setCanConfirm(true);
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // ── Réinitialisation ──
  const resetForm = useCallback(() => {
    setStep("warning");
    setReason("");
    setPassword("");
    setConfirmed(false);
    setIsSubmitting(false);
    setCountdown(CONFIRMATION_DELAY_SECONDS);
    setCanConfirm(false);
    setFieldErrors({});
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    },
    [resetForm]
  );

  // ── Gestion de la soumission ──
  const handleSubmit = useCallback(async () => {
    // Validation côté client
    const parsed = selfDeleteAccountSchema.safeParse({
      reason,
      password,
      confirmation: true,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors(errors);

      // Afficher la première erreur comme toast
      const firstError = Object.values(errors).flat().filter(Boolean)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    setFieldErrors({});
    setStep("confirming");
  }, [reason, password]);

  const handleConfirmDelete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("reason", reason);
      formData.append("password", password);
      formData.append("confirmation", "true");

      const result = (await deleteMyAccountAction(
        formData
      )) as ActionResult;

      if (!result.success) {
        toast.error(result.error || "Échec de la suppression du compte");
        setStep("form");
        setIsSubmitting(false);
        return;
      }

      setStep("submitted");
      toast.success("Compte supprimé avec succès");

      // Redirection après un délai pour afficher le message de confirmation
      setTimeout(() => {
        router.push("/auth/signed-up");
        router.refresh();
      }, 5000);
    } catch (error) {
      toast.error("Erreur inattendue lors de la suppression");
      setStep("form");
      setIsSubmitting(false);
    }
  }, [reason, password, router]);

  const handleBackToForm = useCallback(() => {
    setStep("form");
    setCountdown(CONFIRMATION_DELAY_SECONDS);
    setCanConfirm(false);
  }, []);

  // ── Validation temps réel pour le bouton "Continuer" ──
  const isFormValid =
    reason.trim().length >= 10 && password.length > 0 && confirmed;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* ── Trigger ── */}
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full sm:w-auto gap-2"
          size="lg"
        >
          <Trash2 className="h-5 w-5" />
          Supprimer mon compte
        </Button>
      </DialogTrigger>

      {/* ── Contenu du Dialog ── */}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ÉTAPE 1 : Avertissement */}
        {step === "warning" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive text-xl">
                <AlertTriangle className="h-6 w-6" />
                Supprimer votre compte
              </DialogTitle>
              <DialogDescription className="text-base">
                Vous êtes sur le point de supprimer définitivement votre
                compte et toutes vos données personnelles.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Alert variant="destructive" className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-bold text-red-800">
                  Action irréversible
                </AlertTitle>
                <AlertDescription className="text-xs text-red-700">
                  Cette action est définitive. Veuillez lire attentivement
                  les conséquences ci-dessous avant de continuer.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                {CONSEQUENCES.map((item) => (
                  <ConsequenceItem key={item.title} {...item} />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep("form")}
              >
                Continuer la suppression
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ÉTAPE 2 : Formulaire */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Confirmez la suppression
              </DialogTitle>
              <DialogDescription>
                Veuillez fournir les informations nécessaires pour confirmer
                la suppression définitive de votre compte.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Raison */}
              <div className="space-y-2">
                <Label htmlFor="delete-reason" className="text-sm font-semibold">
                  Raison de la suppression{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (fieldErrors.reason) {
                      setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                    }
                  }}
                  placeholder="Expliquez pourquoi vous souhaitez supprimer votre compte (min. 10 caractères)..."
                  rows={3}
                  className={cn(
                    fieldErrors.reason && "border-destructive ring-destructive/30"
                  )}
                />
                <div className="flex justify-between">
                  {fieldErrors.reason ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.reason[0]}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Minimum 10 caractères
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    {reason.length}/1000
                  </p>
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label
                  htmlFor="delete-password"
                  className="text-sm font-semibold"
                >
                  Mot de passe <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                    placeholder="Votre mot de passe actuel"
                    className={cn(
                      "pl-10",
                      fieldErrors.password &&
                        "border-destructive ring-destructive/30"
                    )}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.password[0]}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Requis pour confirmer votre identité
                </p>
              </div>

              <Separator />

              {/* Confirmation checkbox */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50">
                <Checkbox
                  id="delete-confirmation"
                  checked={confirmed}
                  onCheckedChange={(checked) => {
                    setConfirmed(checked === true);
                    if (fieldErrors.confirmation) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmation: undefined,
                      }));
                    }
                  }}
                  className="mt-0.5 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label
                  htmlFor="delete-confirmation"
                  className="text-sm font-medium text-red-800 cursor-pointer leading-5"
                >
                  Je comprends que cette action est irréversible et que mes
                  données seront définitivement supprimées.
                </Label>
              </div>
              {fieldErrors.confirmation && (
                <p className="text-xs text-destructive">
                  {fieldErrors.confirmation[0]}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={!isFormValid}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Confirmer la suppression
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ÉTAPE 3 : Confirmation avec chronomètre */}
        {step === "confirming" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Clock className="h-5 w-5" />
                Dernière vérification
              </DialogTitle>
              <DialogDescription>
                Veuillez patienter avant la confirmation finale. Ce délai
                vous permet de vérifier votre décision.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6 text-center">
              <div className="flex justify-center">
                <div
                  className={cn(
                    "rounded-full p-4 transition-all duration-500",
                    canConfirm
                      ? "bg-red-100 scale-110"
                      : "bg-slate-100"
                  )}
                >
                  {canConfirm ? (
                    <AlertTriangle className="h-10 w-10 text-red-600 animate-pulse" />
                  ) : (
                    <Clock className="h-10 w-10 text-slate-400" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-lg font-bold text-slate-800">
                  {canConfirm
                    ? "Vous pouvez maintenant confirmer"
                    : `Confirmation disponible dans ${countdown} seconde${countdown > 1 ? "s" : ""}`}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {canConfirm
                    ? "Cliquez sur le bouton ci-dessous pour supprimer définitivement votre compte."
                    : "Veuillez attendre avant de pouvoir finaliser la suppression."}
                </p>
              </div>

              {!canConfirm && (
                <div className="w-full bg-slate-200 rounded-full h-2 max-w-xs mx-auto overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${((CONFIRMATION_DELAY_SECONDS - countdown) / CONFIRMATION_DELAY_SECONDS) * 100}%`,
                    }}
                  />
                </div>
              )}

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-left">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Récapitulatif
                </div>
                <ul className="mt-2 text-xs text-amber-700 space-y-1">
                  <li>• Compte et données personnelles seront anonymisés</li>
                  <li>• Un snapshot est conservé dans le registre interne</li>
                  <li>• Action irréversible</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleBackToForm}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!canConfirm || isSubmitting}
                className="min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Suppression en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Confirmer définitivement
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ÉTAPE 4 : Succès */}
        {step === "submitted" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
                Compte supprimé
              </DialogTitle>
              <DialogDescription className="text-base">
                Votre compte a été supprimé avec succès. Toutes vos données
                personnelles ont été anonymisées.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert className="border-blue-200 bg-blue-50">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-sm font-bold text-blue-800">
                  Registre interne
                </AlertTitle>
                <AlertDescription className="text-xs text-blue-700">
                  Conformément à notre politique de conservation des données,
                  un snapshot de vos informations est conservé dans notre
                  registre interne à des fins légales et de traçabilité.
                  Ces données sont anonymisées et ne peuvent pas être
                  utilisées pour vous identifier.
                </AlertDescription>
              </Alert>

              <div className="text-center py-4">
                <p className="text-sm text-slate-500">
                  Vous allez être redirigé vers la page d&apos;accueil
                  dans quelques instants...
                </p>
                <Loader2 className="h-5 w-5 animate-spin mx-auto mt-2 text-slate-400" />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
