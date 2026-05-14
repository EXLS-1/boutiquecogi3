import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import  { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: "http://localhost:3000/",
  emailAndPassword: {
    enabled: true,
    autoLogIn: false
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    },
    facebook: {
      enabled: true,
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    },
  },
  user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: "user",
            },
        },
  },
  plugins: [nextCookies()]
});
