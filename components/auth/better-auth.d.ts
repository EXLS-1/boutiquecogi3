import { authClient } from "@/lib/auth/auth-client";

interface CustomUser {
  role?: "user" | "admin" | "super_admin" | string;
}

declare module "better-auth" {
  interface User extends CustomUser {}
  interface Session {
    user: User & CustomUser;
  }
}