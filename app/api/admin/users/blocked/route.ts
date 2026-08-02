// app/api/admin/users/blocked/route.ts

import { NextResponse } from 'next/server'
import { UserAdminService } from '@/server/services/user-admin-service'
import { AuthorizationError } from '@/server/core/secure-prisma'

// GET /api/admin/users/blocked — Lister les utilisateurs bloqués
export async function GET() {
    try {
        const users = await UserAdminService.listBlocked()
        return NextResponse.json({ success: true, data: users })
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 403 }
            )
        }
        return NextResponse.json(
            { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
