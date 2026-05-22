// /components/social/social-button.tsx

import Link from "next/link";

import { memo } from "react";

import type { LucideIcon } from "lucide-react";

import { sanitizeUrl } from "@/lib/safe-url";

interface SocialButtonProps {
  url: string;
  name: string;
  icon: LucideIcon;
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

  const isGradient = brandColor.startsWith("linear-gradient");

  return (
    <Link
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      prefetch={false}
      className="
        group
        relative
        flex
        h-24
        w-24
        flex-col
        items-center
        justify-center
        gap-2
        overflow-hidden
        rounded-full
        text-white
        transition-all
        duration-300
        will-change-transform
        hover:-translate-y-2
        hover:scale-105
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-offset-2
        focus-visible:ring-neutral-900
      "
      style={{
        background: brandColor,
        boxShadow: isGradient
          ? "0 10px 30px rgba(0, 0, 0, 0.25)"
          : "0 10px 30px rgba(0, 0, 0, 0.18)",
      }}
    >
      <span
        className="
          absolute
          inset-0
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
        style={{
          background:
            "linear-gradient(to bottom right, rgba(255,255,255,0.18), transparent)",
        }}
      />

      <Icon
        aria-hidden="true"
        className="
          relative
          z-10
          h-7
          w-7
          transition-transform
          duration-300
          group-hover:scale-110
        "
      />

      <span
        className="
          relative
          z-10
          text-[11px]
          font-bold
          uppercase
          tracking-wider
        "
      >
        {name}
      </span>
    </Link>
  );
}

const SocialButton = memo(SocialButtonComponent);

SocialButton.displayName = "SocialButton";

export default SocialButton;
