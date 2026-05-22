// lib/social/social.schema.ts

import { z } from "zod";

export const socialNetworkSchema = z.object({
  id: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(50),
  url: z.string().trim().url(),
  brandColor: z.string().trim().min(1).max(200),
  ariaLabel: z.string().trim().min(1).max(120),
});

export const socialNetworkIdSchema = socialNetworkSchema.pick({ id: true });

export const socialNetworksSchema = z.array(socialNetworkSchema);

export type SocialNetworkSchema = z.infer<typeof socialNetworkSchema>;

export type SocialNetworksSchema = z.infer<typeof socialNetworksSchema>;

export type SocialNetworkIdSchema = z.infer<typeof socialNetworkIdSchema>;
