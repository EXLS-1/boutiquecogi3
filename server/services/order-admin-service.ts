// server/services/order-admin-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { PERMISSIONS, hasPermissionOnResult } from '@/lib/auth/rbac'
import type { OrderStatus } from '@prisma/client'

export class OrderAdminError extends Error {
    constructor(message: string, public code: string) {
        super(message)
        this.name = 'OrderAdminError'
    }
}

export const OrderAdminService = {
    // ─── Lister toutes les commandes (Admin+) ───
    async listAll() {
        return withSecurePrisma(
            async (ctx) => {
                const orders = await ctx.prisma.order.findMany({
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
                                        basePrice: true,
                                        images: true,
                                        slug: true,
                                        stock: {
                                            select: {
                                                quantity: true,
                                                reserved: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        shippingAddress: true,
                    },
                })

                return orders.map((order) => ({
                    ...order,
                    totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
                    items: order.items.map((item) => ({
                        ...item,
                        availableStock: item.product.stock
                            ? item.product.stock.quantity - item.product.stock.reserved
                            : 0,
                    })),
                }))
            },
            {
                minRoleLevel: 2, // ADMIN+
                requiredPermissions: [PERMISSIONS['orders:read']],
                auditLog: false,
            }
        )
    },

    // ─── Récupérer une commande par ID ───
    async getById(orderId: string) {
        if (!orderId) {
            throw new OrderAdminError('ID commande requis', 'VALIDATION_ERROR')
        }

        return withSecurePrisma(
            async (ctx) => {
                const order = await ctx.prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                roleAssignment: {
                                    select: {
                                        role: { select: { name: true, level: true } },
                                    },
                                },
                            },
                        },
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        basePrice: true,
                                        images: true,
                                        slug: true,
                                        stock: {
                                            select: {
                                                quantity: true,
                                                reserved: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        shippingAddress: true,
                    },
                })

                if (!order) {
                    throw new OrderAdminError('Commande non trouvée', 'NOT_FOUND')
                }

                return {
                    ...order,
                    totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
                    totalValue: order.items.reduce(
                        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
                        0
                    ),
                }
            },
            {
                minRoleLevel: 2,
                requiredPermissions: [PERMISSIONS['orders:read']],
                auditLog: false,
            }
        )
    },

    // ─── Mettre à jour le statut d'une commande ───
    async updateStatus(orderId: string, newStatus: OrderStatus, reason?: string) {
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['PROCESSING', 'CANCELLED'],
            PROCESSING: ['SHIPPED', 'CANCELLED'],
            SHIPPED: ['DELIVERED', 'CANCELLED'],
            DELIVERED: ['REFUNDED'],
            CANCELLED: [],
            REFUNDED: [],
        }

        return withSecurePrisma(
            async (ctx) => {
                const order = await ctx.prisma.order.findUnique({
                    where: { id: orderId },
                    include: { items: { include: { product: { include: { stock: true } } } } },
                })

                if (!order) {
                    throw new OrderAdminError('Commande non trouvée', 'NOT_FOUND')
                }

                const allowedNext = validTransitions[order.status]
                if (!allowedNext.includes(newStatus)) {
                    throw new OrderAdminError(
                        `Transition invalide: ${order.status} → ${newStatus}`,
                        'INVALID_TRANSITION'
                    )
                }

                // Si annulation → libération du stock réservé
                if (newStatus === 'CANCELLED') {
                    for (const item of order.items) {
                        if (item.product.stock) {
                            await ctx.prisma.stock.update({
                                where: { productId: item.productId },
                                data: {
                                    reserved: Math.max(
                                        0,
                                        item.product.stock.reserved - item.quantity
                                    ),
                                },
                            })

                            await ctx.prisma.stockMovement.create({
                                data: {
                                    stockId: item.product.stock.id,
                                    type: 'RELEASE',
                                    quantity: item.quantity,
                                    delta: item.quantity,
                                    reason: `Annulation commande ${orderId}`,
                                    orderId,
                                    userId: ctx.userId,
                                },
                            })
                        }
                    }
                }

                // Si confirmation → vérification stock suffisant
                if (newStatus === 'CONFIRMED') {
                    for (const item of order.items) {
                        const available =
                            (item.product.stock?.quantity ?? 0) -
                            (item.product.stock?.reserved ?? 0)
                        if (available < item.quantity) {
                            throw new OrderAdminError(
                                `Stock insuffisant pour "${item.product.name}" (dispo: ${available}, requis: ${item.quantity})`,
                                'INSUFFICIENT_STOCK'
                            )
                        }
                    }
                }

                const updated = await ctx.prisma.order.update({
                    where: { id: orderId },
                    data: { status: newStatus },
                    include: {
                        user: { select: { name: true, email: true } },
                        items: { include: { product: { select: { name: true } } } },
                    },
                })

                await ctx.prisma.auditLog.create({
                    data: {
                        userId: ctx.userId,
                        roleLevel: ctx.roleLevel,
                        action: 'ORDER_STATUS_UPDATED',
                        targetId: orderId,
                        targetType: 'ORDER',
                        details: JSON.stringify({
                            previousStatus: order.status,
                            newStatus,
                            reason: reason || 'Aucune raison fournie',
                        }),
                    },
                })

                return updated
            },
            {
                minRoleLevel: 4, // SUPERVISOR+
                requiredPermissions: [PERMISSIONS['order:status:update']],
                auditLog: true,
            }
        )
    },

    // ─── Annuler une commande (avec restockage) ───
    async cancel(orderId: string, reason?: string) {
        return this.updateStatus(orderId, 'CANCELLED', reason)
    },

    // ─── Statistiques commandes (Dashboard admin) ───
    async getStats() {
        return withSecurePrisma(
            async (ctx) => {
                const [
                    total,
                    pending,
                    confirmed,
                    processing,
                    shipped,
                    delivered,
                    cancelled,
                    refunded,
                    revenue,
                ] = await Promise.all([
                    ctx.prisma.order.count(),
                    ctx.prisma.order.count({ where: { status: 'PENDING' } }),
                    ctx.prisma.order.count({ where: { status: 'CONFIRMED' } }),
                    ctx.prisma.order.count({ where: { status: 'PROCESSING' } }),
                    ctx.prisma.order.count({ where: { status: 'SHIPPED' } }),
                    ctx.prisma.order.count({ where: { status: 'DELIVERED' } }),
                    ctx.prisma.order.count({ where: { status: 'CANCELLED' } }),
                    ctx.prisma.order.count({ where: { status: 'REFUNDED' } }),
                    ctx.prisma.order.aggregate({
                        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
                        _sum: { totalAmount: true },
                    }),
                ])

                return {
                    total,
                    byStatus: {
                        PENDING: pending,
                        CONFIRMED: confirmed,
                        PROCESSING: processing,
                        SHIPPED: shipped,
                        DELIVERED: delivered,
                        CANCELLED: cancelled,
                        REFUNDED: refunded,
                    },
                    revenue: Number(revenue._sum.totalAmount ?? 0),
                    conversionRate:
                        total > 0 ? ((delivered / total) * 100).toFixed(2) + '%' : '0%',
                }
            },
            {
                minRoleLevel: 2,
                requiredPermissions: [PERMISSIONS['analytics:read']],
                auditLog: false,
            }
        )
    },
}