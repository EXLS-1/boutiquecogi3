import { prisma } from '@/prisma/seed-client'

async function main() {
  const { main: seedMain } = await import('@/prisma/seed/index')
  await seedMain(prisma)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })