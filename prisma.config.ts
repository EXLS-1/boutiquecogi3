// This file configures Prisma for the project
// prisma.config.ts
import "dotenv/config"; 
import { defineConfig, env } from "prisma/config";

export default defineConfig({
   earlyAccess: true, // Nécessaire pour Prisma 7.x
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts", // ou "npx tsx prisma/seed.ts" selon ton setup
  },
  datasource: {
    url: env("DATABASE_URL"),
    provider: "postgresql", // ou "mysql", "sqlite", "mongodb" selon ta DB
    
  },
});
