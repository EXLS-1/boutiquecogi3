// Script to apply the account type default value fix
// Run with: npx tsx scripts/fix-account-type.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Setting default value for 'type' column in account table...");

  // Execute raw SQL to set the default on the column
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "account" ALTER COLUMN "type" SET DEFAULT 'email';
  `);
  console.log("Default value set successfully.");

  // Update any existing NULL or empty type values to 'email'
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "account" SET "type" = 'email' WHERE "type" IS NULL OR "type" = '';
  `);
  console.log(`Updated ${result} existing accounts with missing type.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
