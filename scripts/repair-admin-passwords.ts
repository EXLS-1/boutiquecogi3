import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const repairs = [
    { email: "excellentservice1exls@gmail.com", password: "@@@123Admin123@@@" },
    { email: "admin@boutiquecogi3.cd", password: "Password123!" },
  ];

  for (const target of repairs) {
    const user = await prisma.user.findUnique({
      where: { email: target.email },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log(`Missing user: ${target.email}`);
      continue;
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      select: { id: true },
    });

    if (!account) {
      console.log(`Missing credential row: ${target.email}`);
      continue;
    }

    const nextHash = await bcrypt.hash(target.password, 10);
    await prisma.account.update({
      where: { id: account.id },
      data: { password: nextHash, updatedAt: new Date() },
    });

    console.log(`Repaired ${target.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
