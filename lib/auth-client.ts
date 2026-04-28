// lib/auth-client.ts
"use client";

import { createAuthClient } from "better-auth/react";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: SessionUser;
  token: string;
  expiresAt: Date;
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
});

export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession, 
  getSession
} = authClient;