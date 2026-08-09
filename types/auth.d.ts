// NOTE: Better-Auth's `User` is a *type alias*, not an interface, so
// module augmentation (declare module) cannot merge additional fields into it.
// Role is resolved at runtime via `session-provider.ts` which reads
// `u.role ?? u.metadata?.role ?? "GUEST"` and normalizes it through
// `normalizeRole()` from `@/lib/auth/rbac-shared`.
