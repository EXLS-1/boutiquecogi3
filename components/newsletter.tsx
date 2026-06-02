"use client";

import React, { useState, useTransition } from "react";
import { z } from "zod";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

const EmailSchema = z.string().trim().email();

export interface SubscriptionResult {
  success: boolean;
  message?: string;
}

export interface NewsletterProps {
  /**
   * Callback de souscription.
   * Obligatoire.
   */
  onSubscribe: (
    email: string
  ) => Promise<SubscriptionResult>;

  /**
   * Contenu optionnel.
   */
  title?: string;
  description?: string;

  /**
   * Texte du champ email.
   */
  placeholder?: string;

  /**
   * Texte du bouton.
   */
  submitLabel?: string;

  /**
   * Classes personnalisées.
   */
  className?: string;

  /**
   * Désactiver le formulaire.
   */
  disabled?: boolean;

  /**
   * Affichage du feedback.
   */
  showFeedback?: boolean;

  /**
   * Callback succès.
   */
  onSuccess?: (email: string) => void;

  /**
   * Callback erreur.
   */
  onError?: (
    email: string,
    message: string
  ) => void;

  /**
   * Permet d'ajouter du contenu
   * avant le formulaire.
   */
  beforeForm?: React.ReactNode;

  /**
   * Permet d'ajouter du contenu
   * après le formulaire.
   */
  afterForm?: React.ReactNode;
}

type FormStatus =
  | "idle"
  | "success"
  | "error";

export function Newsletter({
  onSubscribe,

  title = "Newsletter",

  description =
    "Inscrivez-vous pour recevoir nos dernières actualités.",

  placeholder = "Votre adresse e-mail",

  submitLabel = "S'inscrire",

  className = "",

  disabled = false,

  showFeedback = true,

  onSuccess,

  onError,

  beforeForm,

  afterForm,
}: NewsletterProps) {
  const [email, setEmail] =
    useState("");

  const [honeypot, setHoneypot] =
    useState("");

  const [status, setStatus] =
    useState<FormStatus>("idle");

  const [message, setMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  const isDisabled =
    disabled || isPending;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /**
     * Honeypot anti-spam.
     */
    if (honeypot.trim()) {
      setStatus("success");
      return;
    }

    const parsed =
      EmailSchema.safeParse(email);

    if (!parsed.success) {
      const errorMessage =
        "Veuillez fournir une adresse e-mail valide.";

      setStatus("error");
      setMessage(errorMessage);

      onError?.(
        email,
        errorMessage
      );

      return;
    }

    const cleanEmail =
      parsed.data;

    startTransition(async () => {
      try {
        const result =
          await onSubscribe(
            cleanEmail
          );

        if (!result.success) {
          const errorMessage =
            result.message ??
            "Une erreur est survenue.";

          setStatus("error");
          setMessage(errorMessage);

          onError?.(
            cleanEmail,
            errorMessage
          );

          return;
        }

        const successMessage =
          result.message ??
          "Inscription effectuée avec succès.";

        setStatus("success");
        setMessage(successMessage);

        setEmail("");

        onSuccess?.(
          cleanEmail
        );
      } catch {
        const errorMessage =
          "Erreur réseau. Veuillez réessayer.";

        setStatus("error");
        setMessage(errorMessage);

        onError?.(
          cleanEmail,
          errorMessage
        );
      }
    });
  }

  return (
    <section
      className={`w-full ${className}`}
      aria-labelledby={
        title
          ? "newsletter-title"
          : undefined
      }
    >
      <div className="space-y-4">
        {title && (
          <h2
            id="newsletter-title"
            className="text-lg font-semibold"
          >
            {title}
          </h2>
        )}

        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {beforeForm}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-3"
        >
          {/* Honeypot */}
          <div
            className="hidden"
            aria-hidden="true"
          >
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) =>
                setHoneypot(
                  e.target.value
                )
              }
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={isDisabled}
              placeholder={
                placeholder
              }
              aria-label="Adresse e-mail"
              aria-invalid={
                status === "error"
              }
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              className="
                flex-1
                rounded-md
                border
                bg-background
                px-4
                py-2.5
                text-sm
                outline-none
                transition
                disabled:cursor-not-allowed
                disabled:opacity-50
                focus:ring-2
              "
            />

            <Button
              type="submit"
              disabled={
                isDisabled
              }
              className="
                min-w-35
              "
            >
              {isPending ? (
                <Loader2
                  className="
                    h-4
                    w-4
                    animate-spin
                  "
                />
              ) : (
                submitLabel
              )}
            </Button>
          </div>

          {showFeedback &&
            status !== "idle" && (
              <div
                role="alert"
                aria-live="polite"
                className={`
                  flex
                  items-center
                  gap-2
                  rounded-md
                  border
                  px-3
                  py-3
                  text-sm
                  ${
                    status ===
                    "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                      : "border-red-500/20 bg-red-500/10 text-red-600"
                  }
                `}
              >
                {status ===
                "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}

                <span>
                  {message}
                </span>
              </div>
            )}
        </form>

        {afterForm}
      </div>
    </section>
  );
}

export default Newsletter;