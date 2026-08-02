// app/api/admin/users/block/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { UserAdminService } from '@/server/services/user-admin-service'
import { blockUserSchema, unblockUserSchema } from '@/lib/validations/role'
import { AuthorizationError } from '@/server/core/secure-prisma'

// POST /api/admin/users/block — Bloquer un utilisateur
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = blockUserSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Données invalides',
                    code: 'VALIDATION_ERROR',
                    fieldErrors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 }
            )
        }

        const result = await UserAdminService.block(parsed.data)
        return NextResponse.json(
            { success: true, data: result, message: `Utilisateur bloqué` },
            { status: 200 }
        )
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 403 }
            )
        }
        if (error instanceof Error) {
            return NextResponse.json(
                { success: false, error: error.message, code: (error as any).code || 'UNKNOWN_ERROR' },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
