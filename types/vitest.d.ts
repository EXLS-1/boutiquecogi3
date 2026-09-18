// types/vitest.d.ts
// ============================================
// Globals Vitest pour TypeScript
// ============================================
// `vitest.config.mts` active `globals: true` : `describe`, `it`, `expect`,
// `afterEach`… sont disponibles sans import. Le projet utilise des
// `typeRoots` personnalisés (`./node_modules/@types` + `./types`), ce qui
// empêche `compilerOptions.types` de résoudre `vitest/globals` (non publié
// sous `@types`). On référence donc les types via ce fichier, inclus par
// `**/*.ts` du tsconfig.
/// <reference types="vitest/globals" />