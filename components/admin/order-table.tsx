'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useRBAC } from '@/lib/auth/auth-client'
import {
    updateOrderStatusAction,
    cancelOrderAction,
} from '@/server/actions/order-admin-actions'
import {
    ArrowUpDown,
    Eye,
    Loader2,
    MoreHorizontal,
    Search,
    XCircle,
    Truck,
    Ban,
    CheckCircle2,
    Clock,
    RefreshCcw,
    Package,
    AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Currency } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ─── Types ───

type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'REFUNDED'

interface OrderUser {
    id: string
    name: string | null
    email: string
    image: string | null
}

interface OrderProduct {
    id: string
    name: string
    basePrice: number
    images: string[]
    slug: string
    stock: { quantity: number; reserved: number } | null
}

interface OrderItem {
    id: string
    productId: string
    quantity: number
    unitPrice: number
    product: OrderProduct
    availableStock: number
}

interface ShippingAddress {
    id: string
    street: string | null
    city: string | null
    country: string | null
    postalCode: string | null
}

interface OrderTableItem {
    id: string
    status: OrderStatus
    totalAmount: number
    subtotalAmount: number
    taxAmount: number
    shippingAmount: number
    discountAmount: number
    currency: Currency
    isPaid: boolean
    paidAt: Date | string | null
    paymentMethod: string | null
    paymentStatus: string | null
    shippingMethod: string | null
    trackingNumber: string | null
    notes: string | null
    createdAt: Date | string
    updatedAt: Date | string
    userId: string
    user: OrderUser
    items: OrderItem[]
    shippingAddress: ShippingAddress | null
    totalItems: number
    couponCode: string | null
}

interface OrderTableProps {
    orders: OrderTableItem[]
}

// ─── Helpers ───

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: [],
}

const STATUS_CONFIG: Record<
    OrderStatus,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
    PENDING: {
        label: 'En attente',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: Clock,
    },
    CONFIRMED: {
        label: 'Confirmée',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: CheckCircle2,
    },
    PROCESSING: {
        label: 'En préparation',
        className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: Package,
    },
    SHIPPED: {
        label: 'Expédiée',
        className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        icon: Truck,
    },
    DELIVERED: {
        label: 'Livrée',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle2,
    },
    CANCELLED: {
        label: 'Annulée',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: Ban,
    },
    REFUNDED: {
        label: 'Remboursée',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: RefreshCcw,
    },
}

function formatPrice(amount: number, currency: Currency = 'USD'): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(amount)
}

function formatDate(date: Date | string): string {
    try {
        return format(new Date(date), 'P HH:mm', { locale: fr })
    } catch {
        return '—'
    }
}

function getPaymentBadge(isPaid: boolean, method: string | null) {
    if (isPaid) {
        return (
            <Badge
                variant="outline"
                className="bg-green-100 text-green-700 border-green-200 text-xs"
            >
                Payée{method ? ` (${method})` : ''}
            </Badge>
        )
    }
    return (
        <Badge
            variant="outline"
            className="bg-orange-100 text-orange-700 border-orange-200 text-xs"
        >
            Non payée
        </Badge>
    )
}

// ─── Composant Principal ───

export function OrderTable({ orders }: OrderTableProps) {
    const router = useRouter()
    const { isStaff, isAdmin } = useRBAC()

    // États
    const [search, setSearch] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState<OrderStatus | 'ALL'>('ALL')
    const [sort, setSort] = React.useState<{
        key: keyof OrderTableItem
        dir: 'asc' | 'desc'
    }>({ key: 'createdAt', dir: 'desc' })
    const [loadingId, setLoadingId] = React.useState<string | null>(null)

    // Dialogs
    const [statusDialog, setStatusDialog] = React.useState<{
        open: boolean
        order: OrderTableItem | null
        newStatus: OrderStatus | ''
        reason: string
    }>({ open: false, order: null, newStatus: '', reason: '' })

    const [cancelDialog, setCancelDialog] = React.useState<{
        open: boolean
        order: OrderTableItem | null
        reason: string
    }>({ open: false, order: null, reason: '' })

    const [detailOrder, setDetailOrder] = React.useState<OrderTableItem | null>(null)
    const [detailOpen, setDetailOpen] = React.useState(false)

    // Filtrage et tri
    const filtered = React.useMemo(() => {
        let data = [...orders]

        // Recherche textuelle
        if (search.trim()) {
            const q = search.toLowerCase()
            data = data.filter(
                (o) =>
                    o.id.toLowerCase().includes(q) ||
                    o.user.name?.toLowerCase().includes(q) ||
                    o.user.email.toLowerCase().includes(q) ||
                    o.items.some((item) => item.product.name.toLowerCase().includes(q))
            )
        }

        // Filtre par statut
        if (statusFilter !== 'ALL') {
            data = data.filter((o) => o.status === statusFilter)
        }

        // Tri
        data.sort((a, b) => {
            const aVal = a[sort.key]
            const bVal = b[sort.key]

            if (sort.key === 'totalAmount') {
                const aNum = Number(aVal)
                const bNum = Number(bVal)
                return sort.dir === 'asc' ? aNum - bNum : bNum - aNum
            }

            if (sort.key === 'createdAt' || sort.key === 'updatedAt') {
                const aDate = new Date(aVal as string).getTime()
                const bDate = new Date(bVal as string).getTime()
                return sort.dir === 'asc' ? aDate - bDate : bDate - aDate
            }

            const aStr = String(aVal ?? '')
            const bStr = String(bVal ?? '')
            return sort.dir === 'asc'
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr)
        })

        return data
    }, [orders, search, statusFilter, sort])

    // Handlers
    const canTransition = (order: OrderTableItem, targetStatus: OrderStatus): boolean => {
        return STATUS_TRANSITIONS[order.status]?.includes(targetStatus) ?? false
    }

    const handleOpenStatusDialog = (order: OrderTableItem, newStatus: OrderStatus) => {
        setStatusDialog({
            open: true,
            order,
            newStatus,
            reason: '',
        })
    }

    const handleConfirmStatus = async () => {
        const { order, newStatus, reason } = statusDialog
        if (!order || !newStatus) return

        setLoadingId(order.id)
        const fd = new FormData()
        fd.append('orderId', order.id)
        fd.append('status', newStatus)
        if (reason.trim()) fd.append('reason', reason.trim())

        const res = await updateOrderStatusAction(fd)
        setLoadingId(null)
        setStatusDialog({ open: false, order: null, newStatus: '', reason: '' })

        if (res.success) {
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleOpenCancelDialog = (order: OrderTableItem) => {
        setCancelDialog({ open: true, order, reason: '' })
    }

    const handleConfirmCancel = async () => {
        const { order, reason } = cancelDialog
        if (!order) return

        setLoadingId(order.id)
        const res = await cancelOrderAction(order.id, reason.trim() || undefined)
        setLoadingId(null)
        setCancelDialog({ open: false, order: null, reason: '' })

        if (res.success) {
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleViewDetails = (order: OrderTableItem) => {
        setDetailOrder(order)
        setDetailOpen(true)
    }

    const renderSortHeader = ({
        label,
        sortKey,
    }: {
        label: string
        sortKey: keyof OrderTableItem
    }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 select-none"
            onClick={() =>
                setSort((s) => ({
                    key: sortKey,
                    dir: s.key === sortKey && s.dir === 'asc' ? 'desc' : 'asc',
                }))
            }
        >
            <span className="flex items-center gap-1">
                {label}
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            </span>
        </TableHead>
    )

    const statusBadge = (status: OrderStatus) => {
        const config = STATUS_CONFIG[status]
        const Icon = config.icon
        return (
            <Badge variant="outline" className={cn('gap-1 text-xs', config.className)}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        )
    }

    return (
        <div className="space-y-4">
            {/* Barre de recherche et filtres */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par ID, client ou produit..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as OrderStatus | 'ALL')}
                >
                    <SelectTrigger className="w-44 h-9">
                        <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tous les statuts</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                    {config.label}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-auto">
                    {filtered.length} commande(s)
                </span>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {renderSortHeader({ label: 'Commande', sortKey: 'id' })}
                            <TableHead>Client</TableHead>
                            <TableHead>Articles</TableHead>
                            {renderSortHeader({ label: 'Total', sortKey: 'totalAmount' })}
                            <TableHead>Paiement</TableHead>
                            <TableHead>Statut</TableHead>
                            {renderSortHeader({ label: 'Date', sortKey: 'createdAt' })}
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Aucune commande trouvée.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((order) => {
                                const isLoading = loadingId === order.id
                                const StatusIcon = STATUS_CONFIG[order.status].icon

                                return (
                                    <TableRow key={order.id} className="group">
                                        {/* ID Commande */}
                                        <TableCell>
                                            <span className="font-mono text-xs font-medium">
                                                #{order.id.slice(0, 8)}
                                            </span>
                                        </TableCell>

                                        {/* Client */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {order.user.name ?? '—'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {order.user.email}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Articles */}
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {order.totalItems} article{order.totalItems > 1 ? 's' : ''}
                                            </span>
                                        </TableCell>

                                        {/* Total */}
                                        <TableCell className="font-mono font-semibold">
                                            {formatPrice(Number(order.totalAmount), order.currency)}
                                        </TableCell>

                                        {/* Paiement */}
                                        <TableCell>
                                            {getPaymentBadge(order.isPaid, order.paymentMethod)}
                                        </TableCell>

                                        {/* Statut */}
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'gap-1 text-xs',
                                                    STATUS_CONFIG[order.status].className
                                                )}
                                            >
                                                <StatusIcon className="h-3 w-3" />
                                                {STATUS_CONFIG[order.status].label}
                                            </Badge>
                                        </TableCell>

                                        {/* Date */}
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(order.createdAt)}
                                        </TableCell>

                                        {/* Actions */}
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
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Voir détails
                                                        </DropdownMenuItem>

                                                        {(isStaff || isAdmin) && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                                                    Changer le statut
                                                                </DropdownMenuLabel>

                                                                {STATUS_TRANSITIONS[order.status]?.map((targetStatus) => {
                                                                    const config = STATUS_CONFIG[targetStatus]
                                                                    const Icon = config.icon
                                                                    return (
                                                                        <DropdownMenuItem
                                                                            key={targetStatus}
                                                                            onClick={() => handleOpenStatusDialog(order, targetStatus)}
                                                                        >
                                                                            <Icon className="mr-2 h-4 w-4" />
                                                                            {config.label}
                                                                        </DropdownMenuItem>
                                                                    )
                                                                })}

                                                                {canTransition(order, 'CANCELLED') && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleOpenCancelDialog(order)}
                                                                            className="text-destructive focus:text-destructive"
                                                                        >
                                                                            <XCircle className="mr-2 h-4 w-4" />
                                                                            Annuler la commande
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
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

            {/* ─── Dialog: Changer le statut ─── */}
            <Dialog
                open={statusDialog.open}
                onOpenChange={(open) => {
                    if (!open) setStatusDialog({ open: false, order: null, newStatus: '', reason: '' })
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Changer le statut de la commande
                        </DialogTitle>
                        <DialogDescription>
                            Commande #{statusDialog.order?.id.slice(0, 8)} —{' '}
                            {statusDialog.order && STATUS_CONFIG[statusDialog.order.status].label}
                            {' → '}
                            {statusDialog.newStatus && STATUS_CONFIG[statusDialog.newStatus as OrderStatus]?.label}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {statusDialog.order && statusDialog.newStatus === 'CANCELLED' && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700">
                                    L&apos;annulation libérera le stock réservé pour cette commande.
                                </p>
                            </div>
                        )}
                        {statusDialog.order && statusDialog.newStatus === 'REFUNDED' && (
                            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 flex items-start gap-2">
                                <RefreshCcw className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-purple-700">
                                    Un remboursement sera initié si le paiement a été effectué.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="status-reason">Raison (optionnelle)</Label>
                            <Textarea
                                id="status-reason"
                                value={statusDialog.reason}
                                onChange={(e) =>
                                    setStatusDialog((s) => ({ ...s, reason: e.target.value }))
                                }
                                placeholder="Pourquoi ce changement de statut ?"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setStatusDialog({ open: false, order: null, newStatus: '', reason: '' })}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleConfirmStatus} disabled={loadingId !== null}>
                            {loadingId !== null ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Dialog: Annulation ─── */}
            <Dialog
                open={cancelDialog.open}
                onOpenChange={(open) => {
                    if (!open) setCancelDialog({ open: false, order: null, reason: '' })
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-5 w-5" />
                            Annuler la commande
                        </DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir annuler la commande{' '}
                            <strong>#{cancelDialog.order?.id.slice(0, 8)}</strong> ?
                            Cette action libérera le stock réservé et est irréversible.
                        </DialogDescription>
                    </DialogHeader>

                    {cancelDialog.order && (
                        <div className="rounded-lg bg-muted p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Client</span>
                                <span className="font-medium">{cancelDialog.order.user.name ?? cancelDialog.order.user.email}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Montant</span>
                                <span className="font-mono font-semibold">
                                    {formatPrice(Number(cancelDialog.order.totalAmount))}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Articles</span>
                                <span className="font-mono">{cancelDialog.order.totalItems}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Statut actuel</span>
                                <Badge variant="outline" className={STATUS_CONFIG[cancelDialog.order.status].className}>
                                    {STATUS_CONFIG[cancelDialog.order.status].label}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="cancel-reason">Raison de l&apos;annulation</Label>
                        <Textarea
                            id="cancel-reason"
                            value={cancelDialog.reason}
                            onChange={(e) =>
                                setCancelDialog((s) => ({ ...s, reason: e.target.value }))
                            }
                            placeholder="Pourquoi annulez-vous cette commande ?"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelDialog({ open: false, order: null, reason: '' })}
                        >
                            Retour
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={loadingId !== null}
                        >
                            {loadingId !== null ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Confirmer l&apos;annulation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Dialog: Détails de la commande ─── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            Commande #{detailOrder?.id.slice(0, 8)}
                            {detailOrder && (
                                <Badge
                                    variant="outline"
                                    className={cn('gap-1', STATUS_CONFIG[detailOrder.status].className)}
                                >
                                    {React.createElement(STATUS_CONFIG[detailOrder.status].icon, { className: 'h-3 w-3' })}
                                    {STATUS_CONFIG[detailOrder.status].label}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Créée le {detailOrder ? formatDate(detailOrder.createdAt) : '—'}
                        </DialogDescription>
                    </DialogHeader>

                    {detailOrder && (
                        <div className="space-y-6">
                            {/* Client */}
                            <div className="rounded-lg border p-4">
                                <h4 className="text-sm font-semibold mb-2">Client</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Nom :</span>{' '}
                                        <span className="font-medium">{detailOrder.user.name ?? '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email :</span>{' '}
                                        <span>{detailOrder.user.email}</span>
                                    </div>
                                    {detailOrder.shippingAddress && (
                                        <>
                                            <div className="col-span-2 mt-2">
                                                <span className="text-muted-foreground">Adresse de livraison :</span>
                                                <p className="mt-1">
                                                    {detailOrder.shippingAddress.street}<br />
                                                    {detailOrder.shippingAddress.postalCode} {detailOrder.shippingAddress.city}<br />
                                                    {detailOrder.shippingAddress.country}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Articles */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3">
                                    Articles ({detailOrder.totalItems})
                                </h4>
                                <div className="border rounded-lg divide-y">
                                    {detailOrder.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{item.product.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    Qté: {item.quantity} × {formatPrice(Number(item.unitPrice))}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-semibold">
                                                    {formatPrice(Number(item.unitPrice) * item.quantity)}
                                                </span>
                                                {item.availableStock !== undefined && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Stock dispo: {item.availableStock}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Résumé financier */}
                            <div className="rounded-lg border p-4">
                                <h4 className="text-sm font-semibold mb-3">Résumé financier</h4>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sous-total</span>
                                        <span className="font-mono">{formatPrice(Number(detailOrder.subtotalAmount), detailOrder.currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Taxe</span>
                                        <span className="font-mono">{formatPrice(Number(detailOrder.taxAmount), detailOrder.currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Livraison</span>
                                        <span className="font-mono">{formatPrice(Number(detailOrder.shippingAmount), detailOrder.currency)}</span>
                                    </div>
                                    {Number(detailOrder.discountAmount) > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Réduction</span>
                                            <span className="font-mono text-green-600">
                                                -{formatPrice(Number(detailOrder.discountAmount), detailOrder.currency)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t font-semibold">
                                        <span>Total</span>
                                        <span className="font-mono">{formatPrice(Number(detailOrder.totalAmount), detailOrder.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Paiement</span>
                                        <span>{getPaymentBadge(detailOrder.isPaid, detailOrder.paymentMethod)}</span>
                                    </div>
                                    {detailOrder.couponCode && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Code promo</span>
                                            <span className="font-mono">{detailOrder.couponCode}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            {detailOrder.notes && (
                                <div className="rounded-lg border p-4">
                                    <h4 className="text-sm font-semibold mb-2">Notes</h4>
                                    <p className="text-sm text-muted-foreground">{detailOrder.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
