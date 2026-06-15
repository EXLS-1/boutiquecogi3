// components/newsletter/newsletter.server.tsx

import React from "react";
import { subscribeToNewsletter } from "@/lib/actions/newsletter.actions";
import { NewsletterForm } from "./newsletter-form.client";
import { NewsletterSuccess } from "@/components/newsletter/newsletter-success.client";

export interface NewsletterProps {
  title?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  disabled?: boolean;
  showFeedback?: boolean;
  onSuccess?: (email: string) => void;
  onError?: (email: string, message: string) => void;
  beforeForm?: React.ReactNode;
  afterForm?: React.ReactNode;
  /** Action d'inscription (Server Action par défaut) */
  onSubscribe?: (email: string) => Promise<{ success: boolean; message?: string }>;
}

/**
 * Composant Newsletter Wrapper.
 * Peut être utilisé côté serveur ou client.
 */
export default function Newsletter({
  title = "Newsletter",
  description = "Inscrivez-vous pour recevoir nos dernières actualités.",
  placeholder = "Votre adresse e-mail",
  submitLabel = "S'inscrire",
  className = "",
  disabled = false,
  showFeedback = true,
  onSuccess,
  onError,
  beforeForm,
  afterForm,
  onSubscribe: onSubscribeProp,
}: NewsletterProps) {
  // Utilise l'action passée en prop ou l'action par défaut (Server Action)
  const onSubscribe = onSubscribeProp || subscribeToNewsletter;

  return (
    <section
      className={`w-full ${className}`}
      aria-labelledby={title ? "newsletter-title" : undefined}
    >
      <div className="space-y-4">
        {/* Succès : on ne peut pas le gérer ici sans state → on délège au client */}
        {/* Pour simplifier, on garde le formulaire client qui gère success/error */}
        {title && (
          <h2 id="newsletter-title" className="text-lg font-semibold">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {beforeForm}

        <NewsletterForm
          onSubscribe={onSubscribe}
          placeholder={placeholder}
          submitLabel={submitLabel}
          disabled={disabled}
          showFeedback={showFeedback}
          onSuccess={onSuccess}
          onError={onError}
        />

        {/* Pour le feedback succès, on peut le faire dans NewsletterForm aussi,
            ou utiliser NewsletterSuccess si tu veux le découper encore plus */}

        {afterForm}
      </div>
    </section>
  );
}