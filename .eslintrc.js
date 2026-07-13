// .eslintrc.js

module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        {
          name: '@prisma/client',
          message: 'Utilisez "withSecurePrisma" depuis @/server/core/secure-prisma au lieu d\'importer Prisma directement.',
        }
      ],
      patterns: [
        {
          group: ['@/lib/prisma', '!@/server/core/secure-prisma'],
          message: 'L\'accès direct à Prisma est interdit. Utilisez withSecurePrisma.',
        }
      ]
    }]
  }
}
