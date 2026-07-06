// components/newsletter/newsletter.server.tsx

import React from "react";
import { subscribeToNewsletter } from "@/lib/actions/newsletter.actions";
import { NewsletterForm } from "./newsletter-form.client";

export interface NewsletterProps {
  title?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  disabled?: boolean;
  showFeedback?: boolean;
  beforeForm?: React.ReactNode;
  afterForm?: React.ReactNode;
}

/**
 * Composant Newsletter Wrapper.
 * Peut être utilisé côté serveur.
 *
 * Important: on ne passe pas de fonctions (callbacks) à un Client Component.
 */
export default function Newsletter({
  title = "Newsletter",
  description = "Inscrivez-vous pour recevoir nos dernières actualités.",
  placeholder = "Votre adresse e-mail",
  submitLabel = "S'inscrire",
  className = "",
  disabled = false,
  showFeedback = true,
  beforeForm,
  afterForm,
}: NewsletterProps) {
  return (
    <section
      className={`w-full ${className}`}
      aria-labelledby={title ? "newsletter-title" : undefined}
    >
      <div className="space-y-4">
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
          onSubscribe={subscribeToNewsletter}
          placeholder={placeholder}
          submitLabel={submitLabel}
          disabled={disabled}
          showFeedback={showFeedback}
        />

        {afterForm}
      </div>
    </section>
  );
}

