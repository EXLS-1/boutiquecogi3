'use server'

import { prisma } from '@/lib/prisma'
import { AuthorizationError } from '@/server/core/secure-prisma'
import { actionRequireAdmin } from '@/lib/auth/server'

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

// ─── Récupérer toutes les commandes (Admin) ───

export async function getAllOrdersAdmin(): Promise<ActionResult> {
  try {
    // Guard : réservé aux administrateurs (ADMIN / SUPER_ADMIN)
    const context = await actionRequireAdmin(async (ctx) => ctx)

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
    })

    return {
      success: true,
      data: orders,
      message: `${orders.length} commande(s) récupérée(s)`,
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message, code: error.code }
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: (error as any).code || 'UNKNOWN_ERROR',
      }
    }
    return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}
