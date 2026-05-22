// /data/social-networks.ts

import type { LucideIcon } from "lucide-react";

import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  MessageCircle,
} from "lucide-react";

import {
  socialNetworksSchema,
  type SocialNetworkSchema,
} from "@/schemas/social.schema";

type SocialNetwork = SocialNetworkSchema & {
  icon: LucideIcon;
};

const rawSocialNetworks: SocialNetwork[] = [
  {
    id: "facebook",
    name: "Facebook",
    url: "https://facebook.com/boutiquecogi3",
    icon: Facebook,
    brandColor: "#1877F2",
    ariaLabel: "Suivez-nous sur Facebook",
  },

  {
    id: "instagram",
    name: "Instagram",
    url: "https://instagram.com/boutiquecogi3",
    icon: Instagram,
    brandColor:
      "linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)",
    ariaLabel: "Suivez-nous sur Instagram",
  },

  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://linkedin.com/company/boutiquecogi3",
    icon: Linkedin,
    brandColor: "#0A66C2",
    ariaLabel: "Suivez-nous sur LinkedIn",
  },

  {
    id: "twitter",
    name: "Twitter X",
    url: "https://x.com/boutiquecogi3",
    icon: Twitter,
    brandColor: "#111111",
    ariaLabel: "Suivez-nous sur X",
  },

  {
    id: "youtube",
    name: "YouTube",
    url: "https://youtube.com/@boutiquecogi3",
    icon: Youtube,
    brandColor: "#FF0000",
    ariaLabel: "Suivez-nous sur YouTube",
  },

  {
    id: "whatsapp",
    name: "WhatsApp",
    url: "https://wa.me/243000000000",
    icon: MessageCircle,
    brandColor: "#25D366",
    ariaLabel: "Contactez-nous sur WhatsApp",
  },
];

socialNetworksSchema.parse(rawSocialNetworks.map(({ icon, ...rest }) => rest));

export const socialNetworks = rawSocialNetworks;
