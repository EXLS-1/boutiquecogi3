import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== USERS ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  console.log(JSON.stringify(users, null, 2));

  console.log("\n=== ACCOUNTS ===");
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      userId: true,
      type: true,
      providerId: true,
      accountId: true,
      password: true,
    },
  });
  console.log(
    JSON.stringify(
      accounts.map((a) => ({
        ...a,
        password: a.password ? `HASHED(${a.password.length})` : null,
      })),
      null,
      2,
    ),
  );

  console.log("\n=== LOGIN ATTEMPTS (last 10) ===");
  const attempts = await prisma.loginAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      email: true,
      ipAddress: true,
      success: true,
      createdAt: true,
    },
  });
  console.log(JSON.stringify(attempts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

