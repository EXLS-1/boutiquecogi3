import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== ENV VARS (presence only) ===");
  console.log("SUPER_ADMIN_EMAIL:", process.env.SUPER_ADMIN_EMAIL ? "SET" : "MISSING");
  console.log("SUPER_ADMIN_PASSWORD:", process.env.SUPER_ADMIN_PASSWORD ? "SET" : "MISSING");
  console.log("SUPER_ADMIN_NAME:", process.env.SUPER_ADMIN_NAME ? "SET" : "MISSING");
  console.log("BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "SET" : "MISSING");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "MISSING");
  console.log("DIRECT_URL:", process.env.DIRECT_URL ? "SET" : "MISSING");
  console.log("NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL ? "SET" : "MISSING");
  console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL ? "SET" : "MISSING");

  console.log("\n=== TABLE COUNTS ===");
  const counts = {
    users: await prisma.user.count(),
    accounts: await prisma.account.count(),
    sessions: await prisma.session.count(),
    roleConfigs: await prisma.roleConfig.count(),
    roleDefinitions: await prisma.roleDefinition.count(),
    roleAssignments: await prisma.roleAssignment.count(),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

