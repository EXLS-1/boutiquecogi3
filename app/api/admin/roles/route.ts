// app/api/admin/roles/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { RoleService } from '@/server/services/role-service'
import { createRoleSchema } from '@/lib/validations/role'
import { AuthorizationError } from '@/server/core/secure-prisma'

// GET /api/admin/roles — Lister tous les rôles
export async function GET() {
    try {
        const roles = await RoleService.list()
        return NextResponse.json({ success: true, data: roles })
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

// POST /api/admin/roles — Créer un rôle
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = createRoleSchema.safeParse(body)

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

        const role = await RoleService.create(parsed.data)
        return NextResponse.json(
            { success: true, data: role, message: `Rôle "${role.name}" créé` },
            { status: 201 }
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
