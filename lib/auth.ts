// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  
  callbacks: {
    session: async (data: any) => {
      const { session, user } = data;
      return {
        ...session,
        user: {
          ...session.user,
          role: user.role || "USER",
        },
      };
    },
  },
  
  advanced: {
    ipAddress: {
      ipAddressHeaders: [],
    },
  },
  
  plugins: [
    nextCookies(),
  ],
});