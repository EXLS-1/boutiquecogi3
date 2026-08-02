// scripts/migrate-users-to-role-assignments.ts
import { PrismaClient, Role as PrismaRole } from '@prisma/client'

const prisma = new PrismaClient()

const ROLE_TO_LEVEL: Record<PrismaRole, number> = {
    [PrismaRole.SUPER_ADMIN]: 1,
    [PrismaRole.ADMIN]: 2,
    [PrismaRole.MANAGER]: 3,
    [PrismaRole.EDITOR]: 4,
    [PrismaRole.SUPERVISOR]: 5,
    [PrismaRole.USER]: 6,
    [PrismaRole.GUEST]: 7,
}

async function migrate() {
    console.log('🚀 Migration des utilisateurs vers RoleAssignment...')

    const roleDefs = await prisma.roleDefinition.findMany()
    if (roleDefs.length === 0) {
        console.error("❌ Aucun RoleDefinition. Exécutez d'abord: npx tsx prisma/seed.ts")
        process.exit(1)
    }

    const users = await prisma.user.findMany()
    console.log(`📊 ${users.length} utilisateurs à migrer`)

    let created = 0, skipped = 0, errors = 0

    for (const user of users) {
        try {
            const existing = await prisma.roleAssignment.findUnique({
                where: { userId: user.id }
            })

            if (existing) {
                skipped++
                continue
            }

            await prisma.roleAssignment.create({
                data: {
                    userId: user.id,
                    level: ROLE_TO_LEVEL[user.role],
                    isBlocked: false,
                    assignedAt: user.createdAt,
                    lastVerifiedAt: new Date(),
                }
            })
            created++
            console.log(`  ✅ ${user.email} — level ${ROLE_TO_LEVEL[user.role]}`)
        } catch (error) {
            console.error(`  ❌ ${user.email}:`, error instanceof Error ? error.message : error)
            errors++
        }
    }

    console.log(`\n📈 Résultat: Créés=${created}, Skippés=${skipped}, Erreurs=${errors}`)
}

migrate()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(async () => await prisma.$disconnect())