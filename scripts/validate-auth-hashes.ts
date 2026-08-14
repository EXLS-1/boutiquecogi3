import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

function isValidBcryptHash(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  if (!value.startsWith("$2")) return false;
  try {
    const rounds = bcrypt.getRounds(value);
    if (!Number.isInteger(rounds) || rounds < 4) return false;
    bcrypt.compareSync("probe-password-for-validation", value);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      userId: true,
      type: true,
      providerId: true,
      accountId: true,
      password: true,
      user: { select: { email: true, name: true } },
    },
  });

  const invalid = accounts.filter((account) => !isValidBcryptHash(account.password));

  console.log(`Total accounts: ${accounts.length}`);
  console.log(`Invalid bcrypt hashes: ${invalid.length}`);

  if (invalid.length > 0) {
    console.log(JSON.stringify(invalid.map((a) => ({
      id: a.id,
      userId: a.userId,
      email: a.user?.email ?? null,
      type: a.type,
      providerId: a.providerId,
      accountId: a.accountId,
      passwordPreview: a.password ? a.password.slice(0, 80) : null,
    })), null, 2));
  }

  console.log("Sample valid hashes:");
  console.log(JSON.stringify(accounts.slice(0, 3).map((a) => ({
    email: a.user?.email ?? null,
    valid: isValidBcryptHash(a.password),
    preview: a.password ? a.password.slice(0, 40) : null,
  })), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
