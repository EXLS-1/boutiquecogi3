// app/admin/stock/page.tsx — Server Component
import { StockTable } from '@/components/admin/stock-table'
import { listAllStocksAction } from '@/server/actions/stock-actions'
import { Warehouse } from 'lucide-react'

export default async function AdminStockPage() {
    const stocksResult = await listAllStocksAction()
    const stocks = stocksResult.success && Array.isArray(stocksResult.data)
        ? stocksResult.data
        : []

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Warehouse className="w-6 h-6 text-slate-700" />
                    Gestion des stocks
                </h1>
                <p className="text-slate-500 mt-1">
                    Suivez et ajustez les niveaux de stock de tous vos produits.
                </p>
            </div>

            <StockTable stocks={stocks} />
        </div>
    )
}
