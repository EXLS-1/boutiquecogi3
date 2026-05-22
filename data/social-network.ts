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
  socialNetworkSchema,
  type SocialNetworkSchema,
} from "@/lib/social.schema";

type SocialNetwork = SocialNetworkSchema & {
  icon: LucideIcon;
};

const rawSocialNetworks: SocialNetwork[] = [
  // ... (Garde ton tableau rawSocialNetworks tel quel)
];

// Validation robuste : on filtre les erreurs au lieu de crasher l'application
export const socialNetworks = rawSocialNetworks.filter((network) => {
  const result = socialNetworkSchema.safeParse({
    id: network.id,
    name: network.name,
    url: network.url,
    brandColor: network.brandColor,
    ariaLabel: network.ariaLabel,
  });

  if (!result.success) {
    console.error(
      `[SocialNetworks] Configuration invalide pour le réseau: ${network.name}`,
      result.error.format(),
    );
    return false;
  }
  return true;
});
