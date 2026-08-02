'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useRBAC } from '@/lib/auth/auth-client'
import {
    adjustStockAction,
    getStockMovementsAction,
} from '@/server/actions/stock-actions'
import {
    ArrowDown,
    ArrowUp,
    History,
    Loader2,
    Package,
    Search,
    TrendingDown,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface StockTableItem {
    id: string
    productId: string
    product: {
        id: string
        name: string
        slug: string
        basePrice: number
        images: string[]
    }
    quantity: number
    reserved: number
    alertThreshold: number
    warehouse: string | null
    lastMovementAt: Date | string
    movements?: {
        id: string
        type: string
        quantity: number
        delta: number
        reason: string | null
        createdAt: Date | string
        user?: { name: string | null } | null
    }[]
}

interface StockTableProps {
    stocks: StockTableItem[]
}

export function StockTable({ stocks }: StockTableProps) {
    const router = useRouter()
    const { isStaff } = useRBAC()
    const [search, setSearch] = React.useState('')
    const [loadingId, setLoadingId] = React.useState<string | null>(null)
    const [movements, setMovements] = React.useState<StockTableItem['movements']>([])
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [adjustForm, setAdjustForm] = React.useState<{
        productId: string
        type: 'IN' | 'OUT' | 'ADJUSTMENT'
        quantity: string
        reason: string
    } | null>(null)

    const filtered = React.useMemo(() => {
        if (!search.trim()) return stocks
        const q = search.toLowerCase()
        return stocks.filter(
            (s) =>
                s.product.name.toLowerCase().includes(q) ||
                s.product.slug.toLowerCase().includes(q) ||
                (s.warehouse?.toLowerCase().includes(q) ?? false)
        )
    }, [stocks, search])

    const getAvailable = (stock: StockTableItem) =>
        Math.max(0, stock.quantity - stock.reserved)

    const isLowStock = (stock: StockTableItem) =>
        getAvailable(stock) <= stock.alertThreshold

    const handleViewMovements = async (productId: string) => {
        setLoadingId(productId)
        const res = await getStockMovementsAction(productId)
        setLoadingId(null)
        if (res.success) {
            setMovements(res.data as StockTableItem['movements'])
            setDialogOpen(true)
        } else {
            alert(res.error)
        }
    }

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!adjustForm) return

        const fd = new FormData()
        fd.append('productId', adjustForm.productId)
        fd.append('type', adjustForm.type)
        fd.append('quantity', adjustForm.quantity)
        if (adjustForm.reason) fd.append('reason', adjustForm.reason)

        setLoadingId(adjustForm.productId)
        const res = await adjustStockAction(fd)
        setLoadingId(null)
        setAdjustForm(null)

        if (res.success) router.refresh()
        else alert(res.error)
    }

    return (
        <div className="space-y-4">
            {/* Barre de recherche */}
            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par produit, slug ou entrepôt..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <span className="text-sm text-muted-foreground ml-auto">
                    {filtered.length} stock(s)
                </span>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Entrepôt</TableHead>
                            <TableHead className="text-right">Physique</TableHead>
                            <TableHead className="text-right">Réservé</TableHead>
                            <TableHead className="text-right">Disponible</TableHead>
                            <TableHead>Seuil</TableHead>
                            <TableHead>Dernier mouv.</TableHead>
                            <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Aucun stock trouvé.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((stock) => {
                                const available = getAvailable(stock)
                                const isLoading = loadingId === stock.productId
                                const low = isLowStock(stock)

                                return (
                                    <TableRow
                                        key={stock.id}
                                        className={cn(low && 'bg-red-50/50')}
                                    >
                                        {/* Produit */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                                    {stock.product.images?.[0] ? (
                                                        <img
                                                            src={stock.product.images[0]}
                                                            alt={stock.product.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {stock.product.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {stock.product.slug}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Entrepôt */}
                                        <TableCell>
                                            {stock.warehouse ?? (
                                                <span className="text-muted-foreground text-sm">
                                                    Défaut
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Quantités */}
                                        <TableCell className="text-right font-mono">
                                            {stock.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-orange-600">
                                            {stock.reserved}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span
                                                className={cn(
                                                    'font-mono font-semibold',
                                                    low ? 'text-red-600' : 'text-green-600'
                                                )}
                                            >
                                                {available}
                                            </span>
                                            {low && (
                                                <Badge
                                                    variant="destructive"
                                                    className="ml-2 gap-1 text-xs"
                                                >
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Critique
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Seuil */}
                                        <TableCell className="font-mono text-sm text-muted-foreground">
                                            {stock.alertThreshold}
                                        </TableCell>

                                        {/* Dernier mouvement */}
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(stock.lastMovementAt).toLocaleDateString(
                                                'fr-FR'
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell>
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    setAdjustForm({
                                                                        productId: stock.productId,
                                                                        type: 'IN',
                                                                        quantity: '',
                                                                        reason: '',
                                                                    })
                                                                }
                                                            >
                                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Ajuster le stock</DialogTitle>
                                                                <DialogDescription>
                                                                    {stock.product.name} — Actuel:{' '}
                                                                    {stock.quantity} unités
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            {adjustForm?.productId === stock.productId && (
                                                                <form
                                                                    onSubmit={handleAdjust}
                                                                    className="space-y-4"
                                                                >
                                                                    <Select
                                                                        value={adjustForm.type}
                                                                        onValueChange={(v) =>
                                                                            setAdjustForm({
                                                                                ...adjustForm,
                                                                                type: v as typeof adjustForm.type,
                                                                            })
                                                                        }
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Type" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="IN">
                                                                                <span className="flex items-center gap-2">
                                                                                    <ArrowDown className="h-4 w-4 text-green-600" />
                                                                                    Entrée (IN)
                                                                                </span>
                                                                            </SelectItem>
                                                                            <SelectItem value="OUT">
                                                                                <span className="flex items-center gap-2">
                                                                                    <ArrowUp className="h-4 w-4 text-red-600" />
                                                                                    Sortie (OUT)
                                                                                </span>
                                                                            </SelectItem>
                                                                            <SelectItem value="ADJUSTMENT">
                                                                                Ajustement
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        placeholder="Quantité"
                                                                        value={adjustForm.quantity}
                                                                        onChange={(e) =>
                                                                            setAdjustForm({
                                                                                ...adjustForm,
                                                                                quantity: e.target.value,
                                                                            })
                                                                        }
                                                                        required
                                                                    />
                                                                    <Input
                                                                        placeholder="Raison (optionnel)"
                                                                        value={adjustForm.reason}
                                                                        onChange={(e) =>
                                                                            setAdjustForm({
                                                                                ...adjustForm,
                                                                                reason: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                    <Button type="submit" className="w-full">
                                                                        Confirmer l'ajustement
                                                                    </Button>
                                                                </form>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleViewMovements(stock.productId)
                                                        }
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog historique */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Historique des mouvements</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Qté</TableHead>
                                    <TableHead>Delta</TableHead>
                                    <TableHead>Raison</TableHead>
                                    <TableHead>Par</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements?.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground"
                                        >
                                            Aucun mouvement
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements?.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-sm">
                                                {new Date(m.createdAt).toLocaleString('fr-FR')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        m.type === 'IN' || m.type === 'RETURN'
                                                            ? 'default'
                                                            : m.type === 'OUT' || m.type === 'RESERVATION'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                    }
                                                >
                                                    {m.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">{m.quantity}</TableCell>
                                            <TableCell
                                                className={cn(
                                                    'font-mono font-semibold',
                                                    m.delta > 0 ? 'text-green-600' : 'text-red-600'
                                                )}
                                            >
                                                {m.delta > 0 ? '+' : ''}
                                                {m.delta}
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate">
                                                {m.reason ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {m.user?.name ?? 'Système'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
