// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import { PERMISSIONS } from '@/lib/auth/rbac'

const prisma = new PrismaClient()

// Mapping enum Role → level
const ROLE_LEVEL_MAP: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 1,
  [Role.ADMIN]: 2,
  [Role.MANAGER]: 3,
  [Role.EDITOR]: 4,
  [Role.SUPERVISOR]: 5,
  [Role.USER]: 6,
  [Role.GUEST]: 7,
}

async function main() {
  console.log('🌱 Démarrage du seed...')

  // 1. Créer les permissions
  const permissionMap = new Map<string, string>()

  for (const [code, meta] of Object.entries(PERMISSIONS)) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: meta.description || code,
        category: meta.category,
        isDangerous: meta.isDangerous,
      }
    })
    permissionMap.set(code, perm.id)
  }
  console.log(`✅ ${permissionMap.size} permissions créées`)

  // 2. Créer les RoleDefinition pour chaque niveau
  const roleDefinitions = [
    { level: 1, name: 'SUPER_ADMIN', description: 'Contrôle absolu' },
    { level: 2, name: 'ADMIN', description: 'Administration générale' },
    { level: 3, name: 'MANAGER', description: 'Gestion équipes et opérations' },
    { level: 4, name: 'EDITOR', description: 'Gestion contenu et produits' },
    { level: 5, name: 'SUPERVISOR', description: 'Supervision commandes' },
    { level: 6, name: 'USER', description: 'Acheteur privilégié' },
    { level: 7, name: 'GUEST', description: 'Visiteur non authentifié' },
  ]

  for (const def of roleDefinitions) {
    await prisma.roleDefinition.upsert({
      where: { level: def.level },
      update: {},
      create: {
        level: def.level,
        name: def.name,
        description: def.description,
        isActive: true,
      }
    })
  }
  console.log(`✅ ${roleDefinitions.length} définitions de rôles créées`)

  // 3. Assigner les permissions par défaut selon le niveau
  for (const [permCode, meta] of Object.entries(PERMISSIONS)) {
    const permId = permissionMap.get(permCode)
    if (!permId) continue

    // Trouver tous les rôles dont le niveau <= minLevel de la permission
    // (niveau plus élevé = numéro plus petit: 1 = SUPER_ADMIN)
    for (const def of roleDefinitions) {
      if (def.level <= meta.minLevel) {
        const roleDef = await prisma.roleDefinition.findUnique({
          where: { level: def.level }
        })
        if (!roleDef) continue

        await prisma.roleDefaultPermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roleDef.id,
              permissionId: permId,
            }
          },
          update: {},
          create: {
            roleId: roleDef.id,
            permissionId: permId,
          }
        })
      }
    }
  }
  console.log('✅ Permissions par défaut assignées')

  // 4. Créer un SUPER_ADMIN par défaut (si aucun n'existe)
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN }
  })

  if (!existingSuperAdmin) {
    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@boutiquecogi3.com',
        name: 'Super Admin',
        role: Role.SUPER_ADMIN,
      }
    })

    await prisma.roleAssignment.create({
      data: {
        userId: superAdmin.id,
        level: 1,
        assignedBy: superAdmin.id,
      }
    })
    console.log('✅ Super Admin créé: admin@boutiquecogi3.com')
  }

  console.log('🎉 Seed terminé avec succès !')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
