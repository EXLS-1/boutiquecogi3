// server/services/audit-alignment.test.ts
// ============================================
// TESTS D'ALIGNEMENT DE L'AUDIT
// Vérifie que chaque action critique appelle recordAuditLog avec les
// bons paramètres : action, targetId, userId, severity.
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditSeverity } from '@prisma/client';

// ─── Mock Prisma ───────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-log-id' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ name: 'Test Actor', email: 'actor@test.com' }),
    },
  },
}));

// ─── Mock session provider ─────────────────────────────────────────────────────
vi.mock('@/lib/auth/session-provider', () => ({
  getSessionFromProvider: vi.fn().mockResolvedValue({
    user: { id: 'actor-uuid-1234-0000-0000-000000000000' },
  }),
}));

import { prisma } from '@/lib/prisma';
import { recordAuditLog, recordServerActionAudit, AuditSeverity as AS } from '@/server/services/audit.service';

// ─── Helper ────────────────────────────────────────────────────────────────────

const auditCreate = () => (prisma.auditLog.create as ReturnType<typeof vi.fn>);
const lastAuditCall = () => auditCreate().mock.calls.at(-1)?.[0]?.data;

const TEST_TARGET_UUID = '11111111-1111-1111-1111-111111111111';
const TEST_ACTOR_UUID  = 'actor-uuid-1234-0000-0000-000000000000';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── MATRICE DE SÉVÉRITÉ ──────────────────────────────────────────────────────

describe('Matrice de sévérité', () => {
  it.each([
    ['ACCOUNT_DELETE',    AuditSeverity.CRITICAL],
    ['ACCOUNT_RESTORE',   AuditSeverity.CRITICAL],
    ['ACCOUNT_SELF_DELETE', AuditSeverity.CRITICAL],
    ['ORDER_CANCEL',      AuditSeverity.CRITICAL],
    ['ROLE_DELETE',       AuditSeverity.CRITICAL],
    ['PRODUCT_DELETE',    AuditSeverity.CRITICAL],
    ['ROLE_UPDATE',       AuditSeverity.WARNING],
    ['ROLE_CREATE',       AuditSeverity.WARNING],
    ['ROLE_BLOCK',        AuditSeverity.WARNING],
    ['USER_BLOCK',        AuditSeverity.WARNING],
    ['USER_UNBLOCK',      AuditSeverity.WARNING],
    ['ROLE_ASSIGN',       AuditSeverity.WARNING],
    ['STOCK_ADJUST',      AuditSeverity.WARNING],
    ['STOCK_INIT',        AuditSeverity.INFO],
    ['STOCK_RESERVE',     AuditSeverity.INFO],
    ['STOCK_RELEASE',     AuditSeverity.INFO],
  ])('action %s → sévérité %s', async (action, expectedSeverity) => {
    const { resolveAuditSeverity } = await import('@/server/services/audit.service');
    expect(resolveAuditSeverity(action)).toBe(expectedSeverity);
  });
});

// ─── recordAuditLog ───────────────────────────────────────────────────────────

describe('recordAuditLog', () => {
  it('insère un log avec les champs action, userId, severity, targetId', async () => {
    await recordAuditLog({
      action: 'ACCOUNT_DELETE',
      targetId: TEST_TARGET_UUID,
      userId: TEST_ACTOR_UUID,
      severity: AuditSeverity.CRITICAL,
      targetType: 'ACCOUNT',
    });

    const data = lastAuditCall();
    expect(data.action).toBe('ACCOUNT_DELETE');
    expect(data.targetId).toBe(TEST_TARGET_UUID);
    expect(data.userId).toBe(TEST_ACTOR_UUID);
    expect(data.severity).toBe(AuditSeverity.CRITICAL);
    expect(data.targetType).toBe('ACCOUNT');
  });

  it('résout la sévérité automatiquement si non spécifiée', async () => {
    await recordAuditLog({ action: 'ROLE_UPDATE', userId: TEST_ACTOR_UUID });
    expect(lastAuditCall().severity).toBe(AuditSeverity.WARNING);
  });

  it('stocke les identifiants non-UUID dans entityId (pas targetId)', async () => {
    await recordAuditLog({ action: 'STOCK_ADJUST', targetId: 'slug-produit', userId: TEST_ACTOR_UUID });
    const data = lastAuditCall();
    expect(data.targetId).toBeUndefined();
    expect(data.entityId).toBe('slug-produit');
  });

  it("ne lève jamais d'exception en cas d'échec Prisma", async () => {
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'));
    await expect(recordAuditLog({ action: 'ROLE_DELETE', userId: null })).resolves.toBeUndefined();
  });
});

// ─── recordServerActionAudit ──────────────────────────────────────────────────

describe('recordServerActionAudit', () => {
  it("extrait l'acteur de la session sécurisée", async () => {
    await recordServerActionAudit({
      action: 'USER_BLOCK',
      targetId: TEST_TARGET_UUID,
      targetType: 'USER',
      severity: AuditSeverity.WARNING,
    });

    const data = lastAuditCall();
    expect(data.userId).toBe(TEST_ACTOR_UUID);
    expect(data.action).toBe('USER_BLOCK');
    expect(data.severity).toBe(AuditSeverity.WARNING);
  });

  it('enregistre status FAILURE pour les tentatives échouées', async () => {
    await recordServerActionAudit({
      action: 'ORDER_STATUS_UPDATE',
      targetId: TEST_TARGET_UUID,
      targetType: 'ORDER',
      severity: AuditSeverity.CRITICAL,
      status: 'FAILURE',
      error: 'Commande introuvable',
    });

    const data = lastAuditCall();
    expect(data.status).toBe('FAILURE');
    expect(data.error).toBe('Commande introuvable');
  });

  it('sérialise les details complexes en JSON', async () => {
    await recordServerActionAudit({
      action: 'STOCK_ADJUST',
      targetType: 'PRODUCT',
      details: { type: 'OUT', quantity: 10 },
    });

    const data = lastAuditCall();
    expect(data.details).toBe(JSON.stringify({ type: 'OUT', quantity: 10 }));
  });
});
