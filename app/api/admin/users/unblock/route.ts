// app/api/admin/users/unblock/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { UserAdminService } from '@/server/services/user-admin-service'
import { unblockUserSchema } from '@/lib/validations/role'
import { AuthorizationError } from '@/server/core/secure-prisma'

// POST /api/admin/users/unblock — Débloquer un utilisateur
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = unblockUserSchema.safeParse(body)

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

        const result = await UserAdminService.unblock(parsed.data)
        return NextResponse.json(
            { success: true, data: result, message: `Utilisateur débloqué` },
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
            const code = 'code' in error && typeof (error as { code?: unknown }).code === 'string'
                ? (error as { code: string }).code
                : 'UNKNOWN_ERROR'
            return NextResponse.json(
                { success: false, error: error.message, code },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
