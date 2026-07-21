// components/newsletter/newsletter-form.client.tsx

"use client";

import { cn } from "@/lib/utils/cn";
import React, { useState, useTransition } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmailSchema } from "@/components/newsletter/newsletter.schema";

export interface NewsletterFormProps {
  onSubscribe: (email: string) => Promise<{ success: boolean; message?: string }>;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  showFeedback?: boolean;
  onSuccess?: (email: string) => void;
  onError?: (email: string, message: string) => void;
}

type FormStatus = "idle" | "success" | "error";

export function NewsletterForm({
  onSubscribe,
  placeholder = "Votre adresse e-mail",
  submitLabel = "S'inscrire",
  disabled = false,
  showFeedback = true,
  onSuccess,
  onError,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const isDisabled = disabled || isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Honeypot anti-spam
    if (honeypot.trim()) {
      setStatus("success");
      return;
    }

    const parsed = EmailSchema.safeParse(email);
    if (!parsed.success) {
      const errorMessage = "Veuillez fournir une adresse e-mail valide.";
      setStatus("error");
      setMessage(errorMessage);
      onError?.(email, errorMessage);
      return;
    }

    const cleanEmail = parsed.data;

    startTransition(async () => {
      try {
        const result = await onSubscribe(cleanEmail);

        if (!result.success) {
          const errorMessage = result.message ?? "Une erreur est survenue.";
          setStatus("error");
          setMessage(errorMessage);
          onError?.(cleanEmail, errorMessage);
          return;
        }

        const successMessage = result.message ?? "Inscription effectuée avec succès.";
        setStatus("success");
        setMessage(successMessage);
        setEmail("");
        onSuccess?.(cleanEmail);
      } catch {
        const errorMessage = "Erreur réseau. Veuillez réessayer.";
        setStatus("error");
        setMessage(errorMessage);
        onError?.(cleanEmail, errorMessage);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          disabled={isDisabled}
          placeholder={placeholder}
          aria-label="Adresse e-mail"
          aria-invalid={status === "error"}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "flex-1",
            "rounded-md",
            "border",
            "bg-background",
            "px-4",
            "py-2.5",
            "text-sm",
            "outline-none",
            "transition",
            "disabled:cursor-not-allowed",
            "disabled:opacity-50",
            "focus:ring-2",
            "focus:ring-primary/50 focus:border-primary dark:focus:ring-primary/70 dark:border-gray-700"
          )}
        />

        <Button type="submit" disabled={isDisabled} className="min-w-35">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span>{submitLabel}</span>
          )}
        </Button>
      </div>

      {showFeedback && (status === "error" || status === "success") && (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-3 text-sm animate-in slide-in-from-top-2",
            {
              "border-red-500/20 bg-red-500/10 text-red-600":
                status === "error",
              "border-green-500/20 bg-green-500/10 text-green-600":
                status === "success",
            },
          )}
        >
          {status === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <span>{message}</span>
        </div>
      )}
    </form>
  );
}