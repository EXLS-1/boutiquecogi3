// components/newsletter/newsletter.schema.ts

import { z } from "zod";

export const EmailSchema = z.string().trim().email();

export type EmailInput = z.infer<typeof EmailSchema>;
