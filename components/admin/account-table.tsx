// components/admin/account-table.tsx

'use client';

// ============================================
// ACCOUNT TABLE — Gestion admin des comptes d'authentification
// ============================================
// Features :
// • Virtualisation native
// • Filtres combinés (recherche + provider + type)
// • Tri multicritère par colonne
// • Pagination complète
// • Dialog détails (infos complètes)
// • Dialog suppression avec confirmation
// • RBAC guards intégrés

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTransition, useCallback, useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

// ─── Auth & RBAC ───────────────────────────
import { useRBAC } from '@/lib/auth/auth-client';

// ─── Store ─────────────────────────────────
import {
  type AccountItem,
  type AccountDetail,
  type PaginationInfo,
} from '@/store/admin/admin-store.types';

// ─── Server Actions ────────────────────────
import {
  getAccountAction,
  deleteAccountAction,
} from '@/server/actions/account-admin-actions'

// ─── UI shadcn ─────────────────────────────
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
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Icons ─────────────────────────────────
import {
  Search,
  Loader2,
  MoreHorizontal,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Eye,
  Trash2,
  Mail,
  Shield,
  Key,
  Globe,
  Clock,
  User,
} from 'lucide-react';

// ═══════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════

interface ActionResult {
  success: boolean
  error?: string
  code?: string
  data?: unknown
}

interface AccountTableProps {
  initialAccounts: AccountItem[]
  initialPagination: PaginationInfo
  initialProviders: string[]
  initialFilters: {
    page: number
    pageSize: number
    search: string
    provider: string
    type: string
    sortBy: string
    sortOrder: 'asc' | 'desc' | string
  }
}

const ROW_HEIGHT = 68
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  oauth: 'OAuth',
  oidc: 'OIDC',
  saml: 'SAML',
  sms: 'SMS',
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    email: 'text-slate-600',
    google: 'text-blue-500',
    github: 'text-gray-800',
    facebook: 'text-blue-700',
    apple: 'text-gray-900',
  }
  return colors[provider.toLowerCase()] ?? 'text-slate-500'
}

function getTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (type === 'email') return 'default'
  if (type === 'oauth' || type === 'oidc') return 'secondary'
  return 'outline'
}

function formatExpiresAt(expiresAt: number | null): string {
  if (!expiresAt) return '—'
  try {
    const d = new Date(expiresAt * 1000)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    if (diff < 0) return 'Expiré'
    if (diff < 86400000) return 'Aujourd\'hui'
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function formatId(id: string | null | undefined): string {
  if (!id) return '—'
  if (id.length > 12) return `${id.slice(0, 8)}...${id.slice(-4)}`
  return id
}

// ═══════════════════════════════════════════
// HOOK : VIRTUALISATION
// ═══════════════════════════════════════════

function useVirtualList<T>(
  items: T[],
  rowHeight: number,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => setScrollTop(el.scrollTop)
    const ro = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height)
    })

    el.addEventListener('scroll', onScroll)
    ro.observe(el)
    setContainerHeight(el.clientHeight)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [containerRef])

  const totalHeight = items.length * rowHeight
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 3)
  const endIdx = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + 3
  )
  const paddingTop = startIdx * rowHeight
  const paddingBottom = (items.length - endIdx) * rowHeight
  const visibleItems = items.slice(startIdx, endIdx)

  return { totalHeight, visibleItems, startIdx, paddingTop, paddingBottom }
}

// ═══════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════

function UserAvatar({ user }: { user: AccountItem['user'] }) {
  if (!user) return null
  const fallback = (user.name?.charAt(0) ?? user.email?.charAt(0) ?? '?').toUpperCase()

  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={user.image ?? ''} alt={user.name ?? ''} />
      <AvatarFallback className="text-xs font-medium">{fallback}</AvatarFallback>
    </Avatar>
  )
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  const providerLower = provider.toLowerCase()
  const colorClass = getProviderColor(provider)

  if (providerLower === 'email') {
    return <Mail className={cn('h-4 w-4', colorClass, className)} />
  }
  if (providerLower === 'google') {
    return <Globe className={cn('h-4 w-4', colorClass, className)} />
  }
  if (providerLower === 'github') {
    return <Key className={cn('h-4 w-4', colorClass, className)} />
  }
  return <Shield className={cn('h-4 w-4', colorClass, className)} />
}

// ═══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════

export function AccountTable({ initialAccounts, initialPagination, initialProviders, initialFilters }: AccountTableProps) {
  const router = useRouter()
  const { isAdmin } = useRBAC()
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const providers = initialProviders

  const containerRef = useRef<HTMLDivElement>(null)

  // ── Pure time reference for expiration checks ──
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  // ── Refresh currentTime every 30s for expiration display ──
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const filters = initialFilters
  const accounts = initialAccounts
  const totalPages = initialPagination.totalPages
  const activeFiltersCount = [filters.search, filters.provider !== 'ALL' ? filters.provider : '', filters.type !== 'ALL' ? filters.type : ''].filter(Boolean).length

  // ── Virtualisation ──
  const virtual = useVirtualList(accounts, ROW_HEIGHT, containerRef)

  // ── Dialog states ──
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean
    account: AccountDetail | null
  }>({ open: false, account: null })

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    accountId: string
    userEmail: string
    provider: string
  }>({ open: false, accountId: '', userEmail: '', provider: '' })
  const [deleteReason, setDeleteReason] = useState('')

  // ═════════════════════════════════════════
  // ACTIONS
  // ═════════════════════════════════════════

  const navigateWithFilters = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    const next = { ...filters, ...updates }
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'ALL' && !(key === 'page' && String(value) === '1') && !(key === 'pageSize' && String(value) === '25') && !(key === 'sortBy' && value === 'createdAt') && !(key === 'sortOrder' && value === 'desc')) {
        params.set(key, String(value))
      }
    })
    startTransition(() => router.replace(`/admin/account?${params.toString()}`))
  }, [filters, router])

  const refreshData = useCallback(() => {
    startTransition(() => router.refresh())
  }, [router])

  const handleSort = useCallback(
    (field: string) => {
      if (filters.sortBy === field) {
        navigateWithFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 })
      } else {
        navigateWithFilters({ sortBy: field, sortOrder: 'asc', page: 1 })
      }
    },
    [filters.sortBy, filters.sortOrder, navigateWithFilters]
  )

  const openDetail = useCallback(async (account: AccountItem) => {
    setLoadingId(account.id)
    try {
      const fd = new FormData()
      fd.append('accountId', account.id)
      const res = await getAccountAction(fd) as unknown as ActionResult
      if (res.success && res.data) {
        setDetailDialog({ open: true, account: res.data as AccountDetail })
      } else {
        toast.error(res.error || 'Impossible de charger les détails')
      }
    } catch {
      toast.error('Erreur lors du chargement des détails')
    } finally {
      setLoadingId(null)
    }
  }, [])

  const openDelete = useCallback((account: AccountItem) => {
    setDeleteDialog({
      open: true,
      accountId: account.id,
      userEmail: account.user?.email ?? 'inconnu',
      provider: account.provider,
    })
    setDeleteReason('')
  }, [])

  const handleDelete = useCallback(async () => {
    const { accountId } = deleteDialog
    if (!accountId) return
    if (!deleteReason.trim()) {
      toast.error('Veuillez fournir une raison pour la suppression')
      return
    }

    setLoadingId(accountId)
    setDeleteDialog((d) => ({ ...d, open: false }))

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('accountId', accountId)
        fd.append('reason', deleteReason)
        const res = await deleteAccountAction(fd) as unknown as ActionResult

        if (!res.success) {
          toast.error(res.error || 'Échec de la suppression')
        } else {
          toast.success('Compte supprimé')
          router.refresh()
        }
      } catch {
        toast.error('Erreur lors de la suppression')
      } finally {
        setLoadingId(null)
        setDeleteReason('')
      }
    })
  }, [deleteDialog, deleteReason, router])

  const handleFilterProvider = useCallback((value: string) => {
    navigateWithFilters({ provider: value, page: 1 })
  }, [navigateWithFilters])

  const handleFilterType = useCallback((value: string) => {
    navigateWithFilters({ type: value, page: 1 })
  }, [navigateWithFilters])

  // ═════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ── Barre supérieure ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, provider ou ID..."
                value={filters.search}
                onChange={(e) => navigateWithFilters({ search: e.target.value, page: 1 })}
                className="pl-9"
              />
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateWithFilters({ page: 1, pageSize: 25, search: '', provider: 'ALL', type: 'ALL', sortBy: 'createdAt', sortOrder: 'desc' })}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Réinitialiser ({activeFiltersCount})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{initialPagination.total}</span>
            <span>compte{initialPagination.total > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Page {filters.page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={refreshData}
              disabled={isPending}
            >
              <RotateCcw className={cn('h-3.5 w-3.5 mr-1', isPending && 'animate-spin')} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* ── Filtres avancés ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filters.provider} onValueChange={handleFilterProvider}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Tous les providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={p} className="h-3 w-3" />
                    {p}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={handleFilterType}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="oauth">OAuth</SelectItem>
              <SelectItem value="oidc">OIDC</SelectItem>
              <SelectItem value="saml">SAML</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(filters.pageSize)}
            onValueChange={(v) => navigateWithFilters({ pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}/page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Table ── */}
        <div className="rounded-md border">
          <div
            ref={containerRef}
            className="overflow-auto relative"
            style={{ maxHeight: '65vh', minHeight: '300px' }}
          >
            <div style={{ height: virtual.totalHeight, position: 'relative' }}>
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                  <TableRow className="h-12">
                    <TableHead className="w-[140px]">
                      <button
                        onClick={() => handleSort('provider')}
                        className="flex items-center gap-1 font-medium"
                      >
                        Provider
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[220px]">
                      <button
                        onClick={() => handleSort('userEmail')}
                        className="flex items-center gap-1 font-medium"
                      >
                        Utilisateur
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[90px]">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Account ID</TableHead>
                    <TableHead className="w-[100px]">Expire le</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {virtual.paddingTop > 0 && (
                    <TableRow className="border-0">
                      <TableCell colSpan={6} className="p-0 border-0" style={{ height: virtual.paddingTop }} />
                    </TableRow>
                  )}

                  {virtual.visibleItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Aucun compte trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    virtual.visibleItems.map((account) => {
                      const isLoading = loadingId === account.id
                      const isExpired = account.expiresAt && account.expiresAt * 1000 < currentTime

                      return (
                        <TableRow
                          key={account.id}
                          className={cn(
                            'group transition-colors',
                            isExpired && 'opacity-50'
                          )}
                          style={{ height: ROW_HEIGHT }}
                        >
                          {/* Provider */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <ProviderIcon provider={account.provider} className="h-5 w-5 shrink-0" />
                              <span className="font-medium text-sm capitalize">
                                {account.provider}
                              </span>
                            </div>
                          </TableCell>

                          {/* Utilisateur */}
                          <TableCell className="py-2">
                            {account.user ? (
                              <div className="flex items-center gap-2">
                                <UserAvatar user={account.user} />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium truncate">
                                    {account.user.name ?? '—'}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {account.user.email}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Utilisateur supprimé
                              </span>
                            )}
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <Badge
                              variant={getTypeBadgeVariant(account.type)}
                              className="text-[10px] font-normal px-1.5 py-0"
                            >
                              {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                            </Badge>
                          </TableCell>

                          {/* Account ID */}
                          <TableCell className="hidden md:table-cell">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs font-mono text-muted-foreground cursor-help">
                                  {formatId(account.providerAccountId)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs">{account.providerAccountId}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Expiration */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className={cn(
                                'text-xs',
                                isExpired && 'text-destructive font-medium'
                              )}>
                                {formatExpiresAt(account.expiresAt)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openDetail(account)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir détails
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openDelete(account)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer le compte
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

                  {virtual.paddingBottom > 0 && (
                    <TableRow className="border-0">
                      <TableCell colSpan={6} className="p-0 border-0" style={{ height: virtual.paddingBottom }} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Affichage de{' '}
            <span className="font-medium text-foreground">
              {(filters.page - 1) * filters.pageSize + 1}
            </span>{' '}
            à{' '}
            <span className="font-medium text-foreground">
              {Math.min(filters.page * filters.pageSize, initialPagination.total)}
            </span>{' '}
            sur <span className="font-medium text-foreground">{initialPagination.total}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateWithFilters({ page: 1 })}
              disabled={filters.page <= 1 || isPending}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateWithFilters({ page: filters.page - 1 })}
              disabled={filters.page <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 tabular-nums">
              {filters.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateWithFilters({ page: filters.page + 1 })}
              disabled={filters.page >= totalPages || isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateWithFilters({ page: totalPages })}
              disabled={filters.page >= totalPages || isPending}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* DIALOG : DÉTAILS DU COMPTE            */}
        {/* ═══════════════════════════════════════ */}
        <Dialog
          open={detailDialog.open}
          onOpenChange={(open) => {
            setDetailDialog((d) => ({ ...d, open }))
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Détails du compte
              </DialogTitle>
              <DialogDescription>
                Informations complètes du compte d&apos;authentification
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const account = detailDialog.account
              if (!account) return null
              return (
                <div className="space-y-6">
                  {/* Header Provider */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <ProviderIcon provider={account.provider} className="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg capitalize">
                        {account.provider}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                      </p>
                    </div>
                    <Badge variant={getTypeBadgeVariant(account.type)}>
                      {account.type}
                    </Badge>
                  </div>

                  {/* Infos utilisateur */}
                  {account.user && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Utilisateur lié
                      </h4>
                      <div className="flex items-center gap-3 p-3 rounded-lg border">
                        <UserAvatar user={account.user} />
                        <div>
                          <p className="font-medium">{account.user.name ?? '—'}</p>
                          <p className="text-sm text-muted-foreground">{account.user.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grille d'informations */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ID du compte</Label>
                      <p className="text-sm font-mono break-all">{account.id}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">User ID</Label>
                      <p className="text-sm font-mono break-all">{account.userId}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Provider Account ID</Label>
                      <p className="text-sm font-mono break-all">{account.providerAccountId}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Expiration</Label>
                      <p className="text-sm">{formatExpiresAt(account.expiresAt)}</p>
                    </div>
                  </div>

                  {/* Tokens (masqués par défaut) */}
                  <details className="group">
                    <summary className="text-sm font-semibold cursor-pointer flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Key className="h-4 w-4" />
                      Informations sensibles
                    </summary>
                    <div className="mt-3 space-y-3 pl-6 border-l-2 border-muted">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Token type</Label>
                        <p className="text-sm">{account.tokenType ?? '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Scope</Label>
                        <p className="text-sm break-all">{account.scope ?? '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Session State</Label>
                        <p className="text-sm font-mono break-all">{account.sessionState ?? '—'}</p>
                      </div>
                    </div>
                  </details>

                  {/* Footer actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    {account.user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/users/${account.userId}`)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Voir l&apos;utilisateur
                      </Button>
                    )}
                  </div>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════ */}
        {/* DIALOG : SUPPRESSION DU COMPTE        */}
        {/* ═══════════════════════════════════════ */}
        <Dialog
          open={deleteDialog.open}
          onOpenChange={(open) => {
            setDeleteDialog((d) => ({ ...d, open }))
            if (!open) setDeleteReason('')
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription>
                Le compte <strong>{deleteDialog.provider}</strong> de{' '}
                <strong>{deleteDialog.userEmail}</strong> sera définitivement supprimé.
                Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{deleteDialog.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Utilisateur</span>
                  <span className="font-medium">{deleteDialog.userEmail}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-reason">
                  Raison <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Pourquoi supprimez-vous ce compte ?"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog((d) => ({ ...d, open: false }))}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!deleteReason.trim() || isPending}
              >
                {isPending && loadingId === deleteDialog.accountId ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Confirmer la suppression
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

