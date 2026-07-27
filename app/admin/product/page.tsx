// app/admin/product/page.tsx — Server Component
import { ProductTable } from '@/components/admin/product-table'
import { listProductsAction } from '@/server/actions/product-actions'
import { Package } from 'lucide-react'

export default async function AdminProductsPage() {
    const productsResult = await listProductsAction()
    const products = productsResult.success && Array.isArray(productsResult.data)
        ? productsResult.data
        : []

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-6 h-6 text-slate-700" />
                    Gestion des produits
                </h1>
                <p className="text-slate-500 mt-1">
                    Gérez votre catalogue de produits, leurs stocks et leurs statuts.
                </p>
            </div>

            <ProductTable products={products} />
        </div>
    )
}
