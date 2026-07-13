// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import { PERMISSIONS, ROLE_HIERARCHY } from '@/lib/auth/rbac'

const prisma = new PrismaClient()

async function main() {
  // 1. Créer les permissions
  const permissionMap = new Map<string, string>()
  
  for (const [code, config] of Object.entries(PERMISSIONS)) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: config.description,
        category: config.category,
        isDangerous: config.isDangerous ?? false,
      }
    })
    permissionMap.set(code, perm.id)
  }

  // 2. Créer les rôles avec permissions par défaut
  for (const [level, config] of Object.entries(ROLE_HIERARCHY)) {
    const levelNum = parseInt(level)
    
    const role = await prisma.role.upsert({
      where: { level: levelNum },
      update: {},
      create: {
        level: levelNum,
        name: config.name,
        description: config.description,
      }
    })

    // Assigner les permissions appropriées au niveau
    for (const [code, permConfig] of Object.entries(PERMISSIONS)) {
      if (permConfig.level <= levelNum) {
        await prisma.roleDefaultPermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permissionMap.get(code)!
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permissionMap.get(code)!,
          }
        })
      }
    }
  }

  console.log('✅ Rôles et permissions initialisés')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })