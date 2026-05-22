// components/Social/SocialButton.tsx

import Link from "next/link";
import { memo } from "react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import { sanitizeUrl } from "@/lib/social/safe-url";
import "./social-button.css";

type SocialIcon = LucideIcon | IconType;

interface SocialButtonProps {
  url: string;
  name: string;
  icon: SocialIcon;
  brandColor: string;
  ariaLabel: string;
}

function SocialButtonComponent({
  url,
  name,
  icon: Icon,
  brandColor,
  ariaLabel,
}: SocialButtonProps) {
  const safeHref = sanitizeUrl(url);

  const isGradient =
    /gradient\s*\(/i.test(brandColor);

  return (
    <Link
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      prefetch={false}
      className={`social-button ${
        isGradient
          ? "social-button--gradient"
          : "social-button--solid"
      }`}
      style={
        {
          "--social-bg": brandColor,
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="social-button__overlay"
      />

      <Icon
        aria-hidden="true"
        className="social-button__icon"
      />

      <span className="social-button__label">
        {name}
      </span>
    </Link>
  );
}

const SocialButton = memo(
  SocialButtonComponent,
);

SocialButton.displayName = "SocialButton";

export default SocialButton;