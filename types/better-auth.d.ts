// types/better-auth.d.ts
import type { Role } from "@/lib/auth/rbac"; // adaptez le chemin

declare module "better-auth" {
  interface User {
    role: Role;
  }
}