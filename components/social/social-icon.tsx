// components/social/social-icon.tsx

"use client";

export default function SocialIcons() {
  const Social_icons = [
  { label: "WhatsApp", icon: "fab fa-whatsapp", href: "#" },
  { label: "Facebook", icon: "fab fa-facebook", href: "#" },
  { label: "Instagram", icon: "fab fa-instagram", href: "#" },
  { label: "TikTok", icon: "fab fa-tiktok", href: "#" },
  ];

  return (
    <div className="flex gap-4">
    {Social_icons.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="text-sky-500 hover:text-rose-500 transition-colors text-xl"
              >
                <i className={social.icon}></i>
              </a>
    ))}
    </div>
  )
}