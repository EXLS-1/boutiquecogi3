// app/admin/order/page.tsx — Server Component
import { OrderTable } from '@/components/admin/order-table'
import { getAllOrdersAdmin } from '@/server/actions/order-admin-actions'
import { requireMinLevel } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'

export default async function AdminOrdersPage() {
    try {
        await requireMinLevel(2, '/unauthorized')
    } catch {
        redirect('/unauthorized')
    }

    const ordersResult = await getAllOrdersAdmin()
    const orders = ordersResult.success && Array.isArray(ordersResult.data)
        ? ordersResult.data
        : []

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-slate-700" />
                    Gestion des commandes
                </h1>
                <p className="text-slate-500 mt-1">
                    Consultez, traitez et gérez l&apos;ensemble des commandes de la boutique.
                </p>
            </div>

            <OrderTable orders={orders} />
        </div>
    )
}
