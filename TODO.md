# TODO — Sécurisation Webhook CinetPay (Anti-Replay)

## Steps
- [x] Analyze existing codebase (route, security, idempotency, schema, checkout)
- [x] 1. Add `PaymentAuditStatus` enum + `PaymentAuditLog` model to `prisma/schema.prisma`
- [x] 2. Create `lib/validations/cinetpay.ts` (Zod schema)
- [x] 3. Create `lib/security/cinetpay-audit.ts` (HMAC timing-safe + S2S verify)
- [x] 4. Create `lib/services/payment-processor.ts` (pipeline anti-replay)
- [x] 5. Refactor `app/api/webhook/cinetpay/route.ts` to use the pipeline
- [x] 6. Run `prisma validate` + `prisma generate` + `prisma db push`
- [x] 7. Typecheck modified files (no errors in new/modified files)
