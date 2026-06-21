// /data/social-networks.ts

import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";

// Toutes les icônes de marque via react-icons (simple-icons)
import {
  SiFacebook,
  SiInstagram,
  SiLinkerd,
  SiYoutube,
  SiX,
  SiTiktok,
  SiWhatsapp,
} from "react-icons/si";

// Ou si tu préfères FontAwesome :
// import {
//   FaFacebook,
//   FaInstagram,
//   FaLinkedin,
//   FaYoutube,
//   FaXTwitter,
//   FaTiktok,
//   FaWhatsapp,
// } from "react-icons/fa6";

import {
  socialNetworkSchema,
  type SocialNetworkSchema,
} from "@/lib/social/social.schema";

type SocialIcon = LucideIcon | IconType;

export type SocialNetwork = SocialNetworkSchema & {
  icon: SocialIcon;
};

const rawSocialNetworks: SocialNetwork[] = [
  {
    id: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/boutiquecogi",
    brandColor: "#1877F2",
    ariaLabel: "Visitez notre page Facebook",
    icon: SiFacebook,
  },
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/boutiquecogi",
    brandColor: "linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)",
    ariaLabel: "Suivez-nous sur Instagram",
    icon: SiInstagram,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/boutiquecogi",
    brandColor: "#0A66C2",
    ariaLabel: "Connectez-vous avec nous sur LinkedIn",
    icon: SiLinkerd,
  },
  {
    id: "x",
    name: "X",
    url: "https://x.com/boutiquecogi",
    brandColor: "#111111",
    ariaLabel: "Suivez-nous sur X",
    icon: SiX,
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@boutiquecogi",
    brandColor: "#FF0000",
    ariaLabel: "Regardez nos vidéos sur YouTube",
    icon: SiYoutube,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    url: "https://wa.me/243000000000",
    brandColor: "#25D366",
    ariaLabel: "Contactez-nous sur WhatsApp",
    icon: SiWhatsapp,
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@boutiquecogi",
    brandColor: "linear-gradient(135deg, #000000 0%, #25F4EE 50%, #FE2C55 100%)",
    ariaLabel: "Suivez-nous sur TikTok",
    icon: SiTiktok,
  },
];

export const socialNetworks: SocialNetwork[] = rawSocialNetworks.filter(
  (network) => {
    const { icon, ...serializableData } = network;
    const result = socialNetworkSchema.safeParse(serializableData);
    if (!result.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[SocialNetworks] Réseau social invalide: ${network.name}`,
          result.error.flatten(),
        );
      }
      return false;
    }
    return true;
  },
);