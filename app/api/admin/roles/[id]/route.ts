// app/api/admin/roles/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { RoleService } from '@/server/services/role-service'
import { AuthorizationError } from '@/server/core/secure-prisma'

// PATCH /api/admin/roles/:id — Modifier un rôle
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const role = await RoleService.update(id, body)
        return NextResponse.json({ success: true, data: role, message: 'Rôle mis à jour' })
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

// DELETE /api/admin/roles/:id — Supprimer un rôle
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const result = await RoleService.delete(id)
        return NextResponse.json({ success: true, data: result, message: 'Rôle supprimé' })
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
