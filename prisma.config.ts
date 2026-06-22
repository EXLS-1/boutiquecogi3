// prisma.config.ts
import "dotenv/config"; 
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    provider: "postgresql",
    url: env("DATABASE_URL"),   
    directUrl: env("DIRECT_URL"),
  },
});