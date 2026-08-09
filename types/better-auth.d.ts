// types/better-auth.d.ts
// NOTE: Both `User`/`Session` and `BetterAuthAdvancedOptions` are *type
// aliases* (not interfaces) in better-auth, so `declare module` augmentation
// cannot extend them. These augmentations were ineffective and duplicated the
// conflicting `types/auth.d.ts`. Role is resolved at runtime via
// `lib/auth/session-provider.ts`, and `generateId` is configured natively in
// `lib/auth.ts` (`advanced.database.generateId: "uuid"`).
