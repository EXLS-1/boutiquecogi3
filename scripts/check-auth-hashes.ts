import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? process.env.INITIAL_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  const candidates = [
    process.env.SUPER_ADMIN_PASSWORD,
    process.env.INITIAL_SUPERADMIN_PASSWORD,
    "@@@123Admin123@@@",
    "Password123!",
  ].filter((v): v is string => !!v);

  console.log("Email:", email || "<none>");
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } })
    : null;

  console.log("User:", user);

  if (!user) {
    console.log("No user matched; listing accounts...");
    const rows = await prisma.account.findMany({ take: 10, select: { id: true, userId: true, type: true, providerId: true, accountId: true, password: true } });
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id },
    select: { id: true, userId: true, type: true, providerId: true, accountId: true, password: true },
  });

  console.log("Account:", account ? { ...account, password: account.password ? account.password.slice(0, 80) : null } : null);

  for (const candidate of candidates) {
    if (!account?.password) continue;
    try {
      const ok = await bcrypt.compare(candidate, account.password);
      console.log("candidate match:", candidate, ok);
    } catch (error) {
      console.log("candidate compare error for:", candidate, error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
