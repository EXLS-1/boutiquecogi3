// types/better-auth.d.ts
import type { Role } from "@/lib/auth/rbac-shared";

declare module "better-auth" {
  interface User {
    role: Role | string;
  }
  interface Session {
    user: User;
  }

  interface BetterAuthAdvancedOptions {
    generateId?: boolean | ((options: { modelName: string }) => string);
  }
}
