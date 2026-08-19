  deletedFilters: filters,
  store.setDeletedEntries(initialEntries, initialPagination)
  store.setDeletedEntries(data.entries, {
// components/admin/deleted-account-table.tsx
// ============================================
// DELETED ACCOUNT TABLE — Registre des comptes supprimés (Admin)
// ============================================
// Features :
// • Virtualisation native
// • Filtres par recherche
// • Tri multicritère par colonne
// • Pagination complète
// • Dialog détails (snapshot utilisateur complet)
// • Dialog restauration avec confirmation
// • RBAC guards intégrés
// ============================================

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransition, useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

// ─── Auth & RBAC ───────────────────────────
import { useRBAC } from '@/lib/auth/auth-client'

// ─── Store ─────────────────────────────────
import {
  useAdminDeletedAccountStore,
  type DeletedAccountItem,
  type DeletedAccountDetail,
  type PaginationInfo,
  type RegistryStats,
} from '@/store/admin-deleted-account-store'

// ─── Server Actions ────────────────────────
import {
  listDeletedAccountsAction,
  getDeletedAccountDetailAction,
  restoreDeletedAccountAction,
  getDeletedAccountStatsAction,
} from '@/server/actions/deleted-account-admin-actions'

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
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  RefreshCw,
  UserX,
  UserCheck,
  Calendar,
  Shield,
  FileText,
  AlertTriangle,
  History,
  Clock,
  Ban,
  CheckCircle2,
} from 'lucide-react'

// ═══════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════

interface ActionResult {
  success: boolean
  error?: string
  code?: string
  data?: unknown
}

interface DeletedAccountTableProps {
  initialEntries: DeletedAccountItem[]
  initialPagination: PaginationInfo
  initialStats: RegistryStats | null
}

const ROW_HEIGHT = 68
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatId(id: string): string {
  if (id.length > 12) return `${id.slice(0, 8)}...${id.slice(-4)}`
  return id
}

function getRoleBadgeColor(role: string): string {
  const roleLower = role.toLowerCase()
  if (roleLower.includes('super')) return 'bg-red-100 text-red-700 border-red-200'
  if (roleLower.includes('admin')) return 'bg-orange-100 text-orange-700 border-orange-200'
  if (roleLower.includes('manager')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (roleLower === 'user') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
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
// SOUS-COMPOSANT : STATS CARDS
// ═══════════════════════════════════════════

function StatsCards({ stats }: { stats: RegistryStats | null }) {
  if (!stats) return null

  const items = [
    {
      icon: Ban,
      label: 'Total supprimés',
      value: stats.totalDeleted,
      color: 'text-red-600 bg-red-50',
    },
    {
      icon: CheckCircle2,
      label: 'Restaurés',
      value: stats.totalRestored,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      icon: Calendar,
      label: 'Aujourd\'hui',
      value: stats.deletedToday,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      icon: Clock,
      label: 'Cette semaine',
      value: stats.deletedThisWeek,
      color: 'text-blue-600 bg-blue-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`rounded-full p-2 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-xl font-bold text-slate-900">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════

export function DeletedAccountTable({
  initialEntries,
  initialPagination,
  initialStats,
}: DeletedAccountTableProps) {
  const router = useRouter()
  const { isAdmin } = useRBAC()
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // ── Store ──
  const store = useAdminDeletedAccountStore()
  const {
    filters,
    setFilter,
    resetFilters,
    setPage,
    setPageSize,
    removeEntry,
    markRestored,
    setCurrentDetail,
    setStats,
  } = store

  const containerRef = useRef<HTMLDivElement>(null)

  // ── Hydratation initiale ──
  useEffect(() => {
    store.setEntries(initialEntries, initialPagination)
    if (initialStats) {
      setStats(initialStats)
    }
  }, [initialEntries, initialPagination, initialStats, store, setStats])

  // ── Scroll reset ──
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [filters.page, filters.pageSize, filters.search])

  // ── Données ──
  const filteredEntries = useMemo(() => store.getFilteredEntries(), [store])
  const paginatedEntries = useMemo(() => {
    const { page, pageSize } = filters
    const start = (page - 1) * pageSize
    return filteredEntries.slice(start, start + pageSize)
  }, [filteredEntries, filters])
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / filters.pageSize))
  const activeFiltersCount = store.getActiveFiltersCount()

  // ── Virtualisation ──
  const virtual = useVirtualList(paginatedEntries, ROW_HEIGHT, containerRef)

  // ── Dialog states ──
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean
    entry: DeletedAccountDetail | null
  }>({ open: false, entry: null })

  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean
    entryId: string
    userEmail: string
  }>({ open: false, entryId: '', userEmail: '' })
  const [restoreNote, setRestoreNote] = useState('')

  // ═════════════════════════════════════════
  // ACTIONS
  // ═════════════════════════════════════════

  const refreshData = useCallback(async () => {
    startTransition(async () => {
      const [entriesRes, statsRes] = await Promise.all([
        listDeletedAccountsAction(
          filters.page,
          filters.pageSize,
          filters.search || undefined,
          filters.sortBy,
          filters.sortOrder
        ),
        getDeletedAccountStatsAction(),
      ])

      if (entriesRes.success && entriesRes.data) {
        const data = entriesRes.data as {
          entries: DeletedAccountItem[]
          total: number
          page: number
          pageSize: number
          totalPages: number
        }
        store.setEntries(data.entries, {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
        })
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as RegistryStats)
      }
    })
  }, [filters, store, setStats])

  const handleSort = useCallback(
    (field: string) => {
      if (filters.sortBy === field) {
        setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setFilter('sortBy', field as 'createdAt' | 'userEmail' | 'deletedBy')
        setFilter('sortOrder', 'desc')
      }
    },
    [filters.sortBy, filters.sortOrder, setFilter]
  )

  const openDetail = useCallback(async (entry: DeletedAccountItem) => {
    setLoadingId(entry.id)
    try {
      const res = await getDeletedAccountDetailAction(entry.id) as ActionResult
      if (res.success && res.data) {
        setDetailDialog({ open: true, entry: res.data as DeletedAccountDetail })
        setCurrentDetail(res.data as DeletedAccountDetail)
      } else {
        toast.error(res.error || 'Impossible de charger les détails')
      }
    } catch {
      toast.error('Erreur lors du chargement des détails')
    } finally {
      setLoadingId(null)
    }
  }, [setCurrentDetail])

  const openRestore = useCallback((entry: DeletedAccountItem) => {
    setRestoreDialog({
      open: true,
      entryId: entry.id,
      userEmail: entry.userEmail,
    })
    setRestoreNote('')
  }, [])

  const handleRestore = useCallback(async () => {
    const { entryId } = restoreDialog
    if (!entryId) return

    setLoadingId(entryId)
    setRestoreDialog((d) => ({ ...d, open: false }))

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('registryId', entryId)
        fd.append('note', restoreNote)
        const res = await restoreDeletedAccountAction(fd) as ActionResult

        if (!res.success) {
          toast.error(res.error || 'Échec de la restauration')
        } else {
          toast.success('Compte restauré avec succès')
          markRestored(entryId, 'admin', restoreNote || null)
          router.refresh()
        }
      } catch {
        toast.error('Erreur lors de la restauration')
      } finally {
        setLoadingId(null)
        setRestoreNote('')
      }
    })
  }, [restoreDialog, restoreNote, markRestored, router])

  // ═════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Statistiques ── */}
        <StatsCards stats={store.stats} />

        {/* ── Barre supérieure ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, nom ou raison..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Réinitialiser ({activeFiltersCount})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{store.pagination.total}</span>
            <span>entrée{store.pagination.total > 1 ? 's' : ''}</span>
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
          <Select
            value={String(filters.pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
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

          <Select
            value={filters.sortBy}
            onValueChange={(v) => handleSort(v)}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date</SelectItem>
              <SelectItem value="userEmail">Email</SelectItem>
              <SelectItem value="deletedBy">Supprimé par</SelectItem>
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
                    <TableHead className="w-[220px]">
                      <button
                        onClick={() => handleSort('userEmail')}
                        className="flex items-center gap-1 font-medium"
                      >
                        Utilisateur
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[100px]">Rôle</TableHead>
                    <TableHead className="hidden md:table-cell">Raison</TableHead>
                    <TableHead className="w-[140px]">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-1 font-medium"
                      >
                        Supprimé le
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[120px]">Statut</TableHead>
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
                        Aucune entrée dans le registre.
                      </TableCell>
                    </TableRow>
                  ) : (
                    virtual.visibleItems.map((entry) => {
                      const isLoading = loadingId === entry.id
                      const isRestored = !!entry.restoredAt

                      return (
                        <TableRow
                          key={entry.id}
                          className={cn(
                            'group transition-colors',
                            isRestored && 'opacity-60'
                          )}
                          style={{ height: ROW_HEIGHT }}
                        >
                          {/* Utilisateur */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-red-100 p-1.5">
                                <UserX className="h-4 w-4 text-red-600" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">
                                  {entry.userName ?? '—'}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {entry.userEmail}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Rôle de suppression */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] font-normal px-1.5 py-0', getRoleBadgeColor(entry.deletedByRole))}
                            >
                              {entry.deletedByRole}
                            </Badge>
                          </TableCell>

                          {/* Raison */}
                          <TableCell className="hidden md:table-cell">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-help line-clamp-1">
                                  {entry.reason}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">{entry.reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Date de suppression */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs">
                                {formatDate(entry.createdAt)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Statut */}
                          <TableCell>
                            {isRestored ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Restauré
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-normal">
                                <Ban className="h-3 w-3 mr-1" />
                                Supprimé
                              </Badge>
                            )}
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
                                  <DropdownMenuItem onClick={() => openDetail(entry)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir snapshot
                                  </DropdownMenuItem>
                                  {isAdmin && !isRestored && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openRestore(entry)}
                                        className="text-emerald-600 focus:text-emerald-600"
                                      >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Restaurer le compte
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
              {Math.min(filters.page * filters.pageSize, filteredEntries.length)}
            </span>{' '}
            sur <span className="font-medium text-foreground">{filteredEntries.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={filters.page <= 1 || isPending}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(filters.page - 1)}
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
              onClick={() => setPage(filters.page + 1)}
              disabled={filters.page >= totalPages || isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={filters.page >= totalPages || isPending}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* DIALOG : DÉTAILS DU SNAPSHOT          */}
        {/* ═══════════════════════════════════════ */}
        <Dialog
          open={detailDialog.open}
          onOpenChange={(open) => {
            setDetailDialog((d) => ({ ...d, open }))
            if (!open) setCurrentDetail(null)
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Snapshot utilisateur
              </DialogTitle>
              <DialogDescription>
                Données complètes de l&apos;utilisateur au moment de la suppression
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const entry = detailDialog.entry
              if (!entry) return null
              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="rounded-full bg-red-100 p-2">
                      <UserX className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">
                        {entry.userName || 'Utilisateur sans nom'}
                      </h3>
                      <p className="text-sm text-muted-foreground">{entry.userEmail}</p>
                    </div>
                    <Badge variant="outline" className={getRoleBadgeColor(entry.deletedByRole)}>
                      Supprimé par: {entry.deletedByRole}
                    </Badge>
                  </div>

                  {/* Informations */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ID du registre</Label>
                      <p className="text-sm font-mono break-all">{entry.id}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">User ID</Label>
                      <p className="text-sm font-mono break-all">{entry.userId}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Supprimé le</Label>
                      <p className="text-sm">{formatDate(entry.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Raison</Label>
                      <p className="text-sm">{entry.reason}</p>
                    </div>
                    {entry.restoredAt && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Restauré le</Label>
                          <p className="text-sm text-emerald-600">{formatDate(entry.restoredAt)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Note de restauration</Label>
                          <p className="text-sm">{entry.restoreNote || '—'}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Snapshot (JSON formaté) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Snapshot des données
                    </Label>
                    <div className="rounded-lg border bg-slate-50 p-4 max-h-64 overflow-auto">
                      <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                        {JSON.stringify(entry.userSnapshot, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Metadata */}
                  {entry.metadata && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Métadonnées</Label>
                      <div className="rounded-lg border bg-slate-50 p-4 max-h-32 overflow-auto">
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════ */}
        {/* DIALOG : RESTAURATION                 */}
        {/* ═══════════════════════════════════════ */}
        <Dialog
          open={restoreDialog.open}
          onOpenChange={(open) => {
            setRestoreDialog((d) => ({ ...d, open }))
            if (!open) setRestoreNote('')
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <RefreshCw className="h-5 w-5" />
                Restaurer le compte
              </DialogTitle>
              <DialogDescription>
                Le compte de <strong>{restoreDialog.userEmail}</strong> sera restauré.
                L&apos;utilisateur pourra à nouveau se connecter.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Information importante
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  La restauration rétablit l&apos;accès au compte mais ne restaure pas
                  les données supprimées (commandes, adresses, etc.). L&apos;utilisateur
                  devra mettre à jour ses informations.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restore-note">
                  Note de restauration
                </Label>
                <Textarea
                  id="restore-note"
                  value={restoreNote}
                  onChange={(e) => setRestoreNote(e.target.value)}
                  placeholder="Optionnel : note interne expliquant la restauration..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRestoreDialog((d) => ({ ...d, open: false }))}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRestore}
                disabled={isPending}
              >
                {isPending && loadingId === restoreDialog.entryId ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Restaurer le compte
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
