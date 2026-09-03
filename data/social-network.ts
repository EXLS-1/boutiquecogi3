// /data/social-networks.ts

import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";

// Toutes les icônes de marque via react-icons (simple-icons)
import {
  SiFacebook,
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiWhatsapp,
} from "react-icons/si";

// Ou si tu préfères FontAwesome :
// import {
//   FaFacebook,
//   FaInstagram,
//   FaYoutube,
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
    brandColor: "rgb(24, 119, 242)",
    ariaLabel: "Visitez notre page Facebook",
    icon: SiFacebook,
  },
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/boutiquecogi",
    brandColor: "linear-gradient(135deg, rgb(245, 133, 41) 0%, rgb(221, 42, 123) 50%, rgb(129, 52, 175) 100%)",
    ariaLabel: "Suivez-nous sur Instagram",
    icon: SiInstagram,
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@boutiquecogi",
    brandColor: "rgb(255, 0, 0)",
    ariaLabel: "Regardez nos vidéos sur YouTube",
    icon: SiYoutube,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    url: "https://wa.me/243000000000",
    brandColor: "rgb(37, 211, 102)",
    ariaLabel: "Contactez-nous sur WhatsApp",
    icon: SiWhatsapp,
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@boutiquecogi",
    brandColor: "linear-gradient(135deg, rgb(0, 0, 0) 0%, rgb(37, 244, 238) 50%, rgb(254, 44, 85) 100%)",
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