// /components/social/social-button.tsx
import { memo, useEffect, useRef } from "react";
import { Facebook } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./social-button.css";

interface SocialButtonProps {
  url?: string;
  name?: string;
  icon?: LucideIcon;
  brandColor?: string;
  ariaLabel?: string;
}

/**
 * Assainit l'URL pour empêcher les attaques XSS (ex: javascript:alert(1))
 */
const sanitizeUrl = (url: string): string => {
  if (!url) return "#";
  const trimmed = url.trim();
  // Autorise uniquement http, https, mailto et tel
  const safePattern = /^(https?|mailto|tel):/i;
  // Si c'est une URL relative ou sécurisée, on la garde, sinon on neutralise
  const isRelative = !/^(?:[a-z+]+:)?\/\//i.test(trimmed);
  return (isRelative || safePattern.test(trimmed)) ? trimmed : "#";
};

function SocialButton({
  url = "https://facebook.com",
  name = "Facebook",
  icon: Icon = Facebook,
  brandColor = "#1877F2",
  ariaLabel = "Suivez-nous sur Facebook",
}: SocialButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const safeHref = sanitizeUrl(url);
  const isGradient = brandColor.includes("gradient");

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.style.setProperty("--social-bg", brandColor);
    }
  }, [brandColor]);

  return (
    <a
      ref={anchorRef}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`social-button ${isGradient ? "social-button--gradient" : "social-button--solid"}`}
    >
      <span
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(45deg,rgba(255,255,255,0.18),transparent)]"
      />

      <Icon
        aria-hidden="true"
        className="relative z-10 h-7 w-7 transition-transform duration-300 group-hover:scale-110"
      />

      <span className="relative z-10 text-[11px] font-bold uppercase tracking-wider">
        {name}
      </span>
    </a>
  );
}

// Memoization pour optimiser les performances lors des changements d'état du RootLayout
export default memo(SocialButton);