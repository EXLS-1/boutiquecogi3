'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useRBAC } from '@/lib/auth/auth-client'
import {
    deleteProductAction
} from '@/server/actions/product-actions'
import {
    adjustStockAction,
    getStockByProductAction,
} from '@/server/actions/stock-actions'
import {
    AlertTriangle,
    ArrowUpDown,
    Edit,
    Eye,
    Loader2,
    MoreHorizontal,
    Package,
    Search,
    Trash2,
    TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'


interface ProductTableItem {
    id: string
    name: string
    slug: string
    sku: string
    basePrice: number
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
    images: string[]
    createdAt: Date | string
    user: { id: string; name: string | null; email: string }
    category: { id: string; name: string } | null
    stock: {
        quantity: number
        reserved: number
        alertThreshold: number
    } | null
}

interface ProductTableProps {
    products: ProductTableItem[]
}

export function ProductTable({ products }: ProductTableProps) {
    const router = useRouter()
    const { isAdmin } = useRBAC()
    const [search, setSearch] = React.useState('')
    const [sort, setSort] = React.useState<{
        key: keyof ProductTableItem
        dir: 'asc' | 'desc'
    }>({ key: 'createdAt', dir: 'desc' })
    const [loadingId, setLoadingId] = React.useState<string | null>(null)
    const [stockDetail, setStockDetail] = React.useState<ProductTableItem['stock'] | null>(null)

    const filtered = React.useMemo(() => {
        let data = [...products]
        if (search.trim()) {
            const q = search.toLowerCase()
            data = data.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q) ||
                    p.slug.toLowerCase().includes(q) ||
                    p.category?.name.toLowerCase().includes(q)
            )
        }
        data.sort((a, b) => {
            const aVal = a[sort.key]
            const bVal = b[sort.key]
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sort.dir === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal)
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sort.dir === 'asc' ? aVal - bVal : bVal - aVal
            }
            return 0
        })
        return data
    }, [products, search, sort])

    const getAvailable = (p: ProductTableItem) =>
        p.stock ? Math.max(0, p.stock.quantity - p.stock.reserved) : 0

    const isLowStock = (p: ProductTableItem) =>
        p.stock ? getAvailable(p) <= p.stock.alertThreshold : false

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer définitivement ce produit ?')) return
        setLoadingId(id)
        const res = await deleteProductAction(id)
        setLoadingId(null)
        if (res.success) router.refresh()
        else alert(res.error)
    }

    const handleQuickStock = async (productId: string) => {
        setLoadingId(productId)
        const res = await getStockByProductAction(productId)
        setLoadingId(null)
        if (res.success) setStockDetail(res.data as ProductTableItem['stock'])
    }

    const handleRestock = async (productId: string) => {
        const qty = prompt('Quantité à ajouter :')
        if (!qty || isNaN(Number(qty))) return
        const fd = new FormData()
        fd.append('productId', productId)
        fd.append('type', 'IN')
        fd.append('quantity', qty)
        fd.append('reason', 'Réapprovisionnement rapide')
        setLoadingId(productId)
        const res = await adjustStockAction(fd)
        setLoadingId(null)
        if (res.success) router.refresh()
        else alert(res.error)
    }

    const renderSortHeader = ({
        label,
        sortKey,
    }: {
        label: string
        sortKey: keyof ProductTableItem
    }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50"
            onClick={() =>
                setSort((s) => ({
                    key: sortKey,
                    dir: s.key === sortKey && s.dir === 'asc' ? 'desc' : 'asc',
                }))
            }
        >
            <span className="flex items-center gap-1">
                {label}
                <ArrowUpDown className="h-3 w-3" />
            </span>
        </TableHead>
    )

    const statusBadge = (status: ProductTableItem['status']) => {

        const map = {
            ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700 border-green-200' },
            DRAFT: { label: 'Brouillon', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            ARCHIVED: { label: 'Archivé', className: 'bg-gray-100 text-gray-500 border-gray-200' },
        }
        const s = map[status]
        return (
            <Badge variant="outline" className={cn(s.className)}>
                {s.label}
            </Badge>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par nom, SKU, catégorie..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <span className="text-sm text-muted-foreground ml-auto">
                    {filtered.length} produit(s)
                </span>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {renderSortHeader({ label: 'Produit', sortKey: 'name' })}
                            <TableHead>SKU</TableHead>
                            <TableHead>Catégorie</TableHead>
                            {renderSortHeader({ label: 'Prix', sortKey: 'basePrice' })}
                            <TableHead>Stock</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Aucun produit trouvé.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((product) => {
                                const isLoading = loadingId === product.id
                                const available = getAvailable(product)
                                const low = isLowStock(product)

                                return (
                                    <TableRow
                                        key={product.id}
                                        className={cn(low && 'bg-red-50/50')}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                                    {product.images?.[0] ? (
                                                        <Image
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{product.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {product.slug}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="font-mono text-sm">
                                            {product.sku}
                                        </TableCell>

                                        <TableCell>{product.category?.name ?? '—'}</TableCell>

                                        <TableCell className="font-mono">
                                            {Number(product.basePrice).toFixed(2)} €
                                        </TableCell>

                                        <TableCell>
                                            {product.stock ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span
                                                        className={cn(
                                                            'font-mono font-semibold text-sm',
                                                            low ? 'text-red-600' : 'text-green-600'
                                                        )}
                                                    >
                                                        {available} dispo
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {product.stock.quantity} tot. /{' '}
                                                        {product.stock.reserved} rés.
                                                    </span>
                                                    {low && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="w-fit gap-1 text-xs mt-1"
                                                        >
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Stock critique
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">
                                                    Non initialisé
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell>{statusBadge(product.status)}</TableCell>

                                        <TableCell>
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.push(`/products/${product.slug}`)
                                                            }
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Voir
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.push(`/admin/products/${product.id}/edit`)
                                                            }
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Modifier
                                                        </DropdownMenuItem>
                                                        {product.stock ? (
                                                            <DropdownMenuItem
                                                                onClick={() => handleRestock(product.id)}
                                                            >
                                                                <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                                                                Réapprovisionner
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => handleQuickStock(product.id)}
                                                            >
                                                                <Package className="mr-2 h-4 w-4" />
                                                                Voir stock
                                                            </DropdownMenuItem>
                                                        )}
                                                        {isAdmin && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(product.id)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Supprimer
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
