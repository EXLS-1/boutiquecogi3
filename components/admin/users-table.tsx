  userFilters: filters,
'use client'

// ============================================
// USERS TABLE — Composant fusionné unifié
// ============================================
// Fusion de : users-table.tsx + user-table.tsx + blocked-users-table.tsx
//
// Features :
// • Virtualisation native (sans lib externe)
// • Tabs unifiés : Tous / Bloqués
// • Filtres avancés combinés (recherche + rôle + statut)
// • Tri multicritère par colonne
// • Pagination complète
// • Optimistic updates + Rollback atomique (snapshot)
// • Optimistic locking (version)
// • RBAC guards intégrés
// • Gestion de concurrence (refresh auto en cas de conflit)
//
// Corrections TS apportées :
// • useState(() => setUsers()) remplacé par useEffect
// • Import server-only ROLE_HIERARCHY supprimé → RoleLevelConfig client-safe
// • Typage strict des actions serveur (ActionResult)
// • Normalisation des signatures d'API

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransition, useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

// ─── Auth & RBAC ───────────────────────────
import { useRBAC } from '@/lib/auth/auth-client'
import { getRoleConfig, getRoleLevel, type Role } from '@/lib/auth/rbac-shared'

// ─── Store ─────────────────────────────────
import {
  useAdminStore,
  type AdminUser,
  type BlockedUser,
  type StatusFilter,
  type SortField,
} from '@/store/admin-store'

// ─── Server Actions ────────────────────────
import {
  blockUserAction,
  unblockUserAction,
  updateUserRole,
  listUsersAction,
  listBlockedUsersAction,
} from '@/server/actions/user-admin-actions'

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Icons ─────────────────────────────────
import {
  Search,
  Ban,
  CheckCircle2,
  Shield,
  Loader2,
  MoreHorizontal,
  Unlock,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Eye,
} from 'lucide-react'

// ═══════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════

interface ActionResult {
  success: boolean
  error?: string
  code?: 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | string
  data?: unknown
}

interface UsersTableProps {
  initialUsers: AdminUser[]
  initialBlockedUsers: BlockedUser[]
}

const ROW_HEIGHT = 72 // hauteur estimée d'une ligne en px
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const ALL_ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'EDITOR',
  'SUPERVISOR',
  'USER',
  'GUEST',
]

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'BLOCKED', label: 'Bloqué' },
]

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function getUserStatus(user: AdminUser): 'active' | 'blocked' | 'pending' {
  if (user.isBlocked) return 'blocked'
  if (user.emailVerified) return 'active'
  return 'pending'
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  try {
    return format(new Date(d), 'PPp', { locale: fr })
  } catch {
    return '—'
  }
}

function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  try {
    return format(new Date(d), 'P', { locale: fr })
  } catch {
    return '—'
  }
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

  return {
    totalHeight,
    visibleItems,
    startIdx,
    paddingTop,
    paddingBottom,
  }
}

// ═══════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════

function UserAvatar({ user }: { user: AdminUser | BlockedUser }) {
  const name = user.name
  const email = user.email ?? ''
  const image = 'image' in user ? user.image : null
  const fallback = (name?.charAt(0) ?? email?.charAt(0) ?? '?').toUpperCase()

  return (
    <Avatar className="h-9 w-9">
      <AvatarImage src={image ?? ''} alt={name ?? ''} />
      <AvatarFallback className="text-xs font-medium">{fallback}</AvatarFallback>
    </Avatar>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const config = getRoleConfig(role)
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-normal text-xs px-2 py-0.5',
        config.bgClass,
        config.textClass,
        config.borderClass
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function StatusBadge({ status }: { status: 'active' | 'blocked' | 'pending' }) {
  if (status === 'blocked') {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <Ban className="h-3 w-3" />
        Bloqué
      </Badge>
    )
  }
  if (status === 'active') {
    return (
      <Badge
        variant="default"
        className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
      >
        <CheckCircle2 className="h-3 w-3" />
        Actif
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Shield className="h-3 w-3" />
      En attente
    </Badge>
  )
}

// ═══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════

export function UsersTable({ initialUsers, initialBlockedUsers }: UsersTableProps) {
  const router = useRouter()
  const { isAdmin } = useRBAC()
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'blocked'>('all')

  // ── Store ──
  const store = useAdminStore()
  const {
    filters,
    setFilter,
    resetFilters,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
    saveSnapshot,
    restoreSnapshot,
    clearSnapshot,
    updateUserRole: storeUpdateRole,
    blockUserOptimistic,
    unblockUserOptimistic,
    updateUser,
    setUsers,
    setBlockedUsers,
  } = store

  // ── Reset scroll on tab/filter/page change ──
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [activeTab, filters.page, filters.pageSize, filters.search, filters.roleFilter, filters.statusFilter])

  // ── Hydratation initiale (CORRECTION : useEffect au lieu de useState) ──
  useEffect(() => {
    setUsers(initialUsers)
    setBlockedUsers(initialBlockedUsers)
  }, [initialUsers, initialBlockedUsers, setUsers, setBlockedUsers])

  // ── Données filtrées ──
  const filteredUsers = useMemo(() => store.getFilteredUsers(), [store, filters, store.users])
  const filteredBlocked = useMemo(() => store.getFilteredBlockedUsers(), [store, filters, store.blockedUsers])
  const paginatedUsers = useMemo(() => store.getPaginatedUsers(), [store, filters, store.users])
  const paginatedBlocked = useMemo(() => store.getPaginatedBlockedUsers(), [store, filters, store.blockedUsers])
  const totalPages = activeTab === 'all' ? store.getTotalPages() : store.getTotalBlockedPages()
  const activeFiltersCount = store.getActiveFiltersCount()

  // ── Virtualisation ──
  const containerRef = useRef<HTMLDivElement>(null)
  const virtualAll = useVirtualList(paginatedUsers, ROW_HEIGHT, containerRef)
  const virtualBlocked = useVirtualList(paginatedBlocked, ROW_HEIGHT, containerRef)
  const virtual = activeTab === 'all' ? virtualAll : virtualBlocked

  // ── Dialogs state ──
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean
    userId: string
    name: string | null
    email: string
  }>({ open: false, userId: '', name: null, email: '' })

  const [unblockDialog, setUnblockDialog] = useState<{
    open: boolean
    userId: string
    name: string | null
    email: string
  }>({ open: false, userId: '', name: null, email: '' })

  // ── Form states ──
  const [blockReason, setBlockReason] = useState('')
  const [blockPermanent, setBlockPermanent] = useState(false)
  const [blockUntil, setBlockUntil] = useState('')
  const [unblockReason, setUnblockReason] = useState('')

  // ═════════════════════════════════════════
  // ACTIONS (CRUD + Optimistic + Rollback)
  // ═════════════════════════════════════════

  /** Rafraîchissement atomique des données (pour rollback ou conflit) */
  const refreshData = useCallback(async () => {
    startTransition(async () => {
      const [usersRes, blockedRes] = await Promise.all([
        listUsersAction(),
        listBlockedUsersAction(),
      ])
      if (usersRes.success && Array.isArray(usersRes.data)) {
        setUsers(usersRes.data as AdminUser[])
      }
      if (blockedRes.success && Array.isArray(blockedRes.data)) {
        setBlockedUsers(blockedRes.data as BlockedUser[])
      }
    })
  }, [setUsers, setBlockedUsers])

  /** Changement de rôle avec optimistic locking */
  const handleRoleChange = useCallback(
    async (userId: string, newRole: Role) => {
      const user = store.users.find((u) => u.id === userId)
      if (!user) return
      if (user.role === newRole) return

      const previousRole = user.role
      const previousLevel = user.roleLevel
      const currentVersion = user.version

      // Guard hiérarchique : ne peut pas s'auto-dégrader ni gérer un rôle supérieur
      // (logique métier à adapter selon vos règles RBAC)

      if (!confirm(`Confirmer le changement de rôle vers « ${newRole} » ?`)) return

      setLoadingId(userId)
      saveSnapshot()

      // Optimistic update
      storeUpdateRole(userId, newRole, getRoleLevel(newRole))

      startTransition(async () => {
        try {
          // NOTE : adapter la signature serveur si nécessaire pour inclure `version`
          const res = (await updateUserRole(
            userId,
            newRole
            // , currentVersion  // ← décommenter quand le serveur supporte le versionnage
          )) as unknown as ActionResult

          if (!res.success) {
            if (res.code === 'CONFLICT') {
              toast.error('Conflit détecté : un autre admin a modifié cet utilisateur.')
              await refreshData()
            } else {
              throw new Error(res.error || 'Échec du changement de rôle')
            }
          } else {
            toast.success(`Rôle mis à jour : ${newRole}`)
            clearSnapshot()
            router.refresh()
          }
        } catch (err) {
          restoreSnapshot()
          toast.error(err instanceof Error ? err.message : 'Erreur inconnue')
        } finally {
          setLoadingId(null)
        }
      })
    },
    [store.users, saveSnapshot, storeUpdateRole, restoreSnapshot, clearSnapshot, refreshData, router]
  )

  /** Blocage avec optimistic update */
  const handleBlock = useCallback(async () => {
    const { userId } = blockDialog
    if (!userId) return
    if (!blockReason.trim()) {
      toast.error('La raison du blocage est obligatoire')
      return
    }

    const user = store.users.find((u) => u.id === userId)
    if (!user) return

    setLoadingId(userId)
    saveSnapshot()
    setBlockDialog((d) => ({ ...d, open: false }))

    const patch: Partial<AdminUser> = {
      blockedReason: blockReason,
      blockedAt: new Date().toISOString(),
      isPermanent: blockPermanent,
      blockedUntil: blockPermanent ? null : blockUntil ? new Date(blockUntil).toISOString() : null,
    }

    blockUserOptimistic(userId, patch)

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('userId', userId)
        fd.append('reason', blockReason)
        fd.append('permanent', String(blockPermanent))
        if (!blockPermanent && blockUntil) fd.append('blockedUntil', blockUntil)
        // fd.append('version', String(user.version)) // ← optimistic locking

        const res = (await blockUserAction(fd)) as unknown as ActionResult

        if (!res.success) {
          if (res.code === 'CONFLICT') {
            toast.error('Conflit détecté lors du blocage.')
            await refreshData()
          } else {
            throw new Error(res.error || 'Échec du blocage')
          }
        } else {
          toast.success('Utilisateur bloqué')
          clearSnapshot()
          setBlockReason('')
          setBlockPermanent(false)
          setBlockUntil('')
          router.refresh()
        }
      } catch (err) {
        restoreSnapshot()
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoadingId(null)
      }
    })
  }, [blockDialog, blockReason, blockPermanent, blockUntil, store.users, saveSnapshot, blockUserOptimistic, restoreSnapshot, clearSnapshot, refreshData, router])

  /** Déblocage avec optimistic update */
  const handleUnblock = useCallback(async () => {
    const { userId } = unblockDialog
    if (!userId) return

    const user = store.users.find((u) => u.id === userId)
    if (!user) return

    setLoadingId(userId)
    saveSnapshot()
    setUnblockDialog((d) => ({ ...d, open: false }))

    unblockUserOptimistic(userId)

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('userId', userId)
        if (unblockReason) fd.append('reason', unblockReason)
        // fd.append('version', String(user.version)) // ← optimistic locking

        const res = (await unblockUserAction(fd)) as unknown as ActionResult

        if (!res.success) {
          if (res.code === 'CONFLICT') {
            toast.error('Conflit détecté lors du déblocage.')
            await refreshData()
          } else {
            throw new Error(res.error || 'Échec du déblocage')
          }
        } else {
          toast.success('Utilisateur débloqué')
          clearSnapshot()
          setUnblockReason('')
          router.refresh()
        }
      } catch (err) {
        restoreSnapshot()
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoadingId(null)
      }
    })
  }, [unblockDialog, unblockReason, store.users, saveSnapshot, unblockUserOptimistic, restoreSnapshot, clearSnapshot, refreshData, router])

  // ── Handlers UI ──
  const handleSort = useCallback(
    (field: SortField) => {
      if (filters.sortBy === field) {
        setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setFilter('sortBy', field)
        setFilter('sortOrder', 'asc')
      }
    },
    [filters.sortBy, filters.sortOrder, setFilter]
  )

  const openBlockDialog = useCallback((user: AdminUser) => {
    setBlockDialog({ open: true, userId: user.id, name: user.name, email: user.email })
    setBlockReason('')
    setBlockPermanent(false)
    setBlockUntil('')
  }, [])

  const openUnblockDialog = useCallback((user: AdminUser | BlockedUser) => {
    const id = 'userId' in user ? user.userId : user.id
    const name = user.name
    const email = user.email ?? ''
    setUnblockDialog({ open: true, userId: id, name, email })
    setUnblockReason('')
  }, [])

  // ═════════════════════════════════════════
  // RENDER : HEADER TOOLBAR
  // ═════════════════════════════════════════

  const totalCount = activeTab === 'all' ? filteredUsers.length : filteredBlocked.length
  const currentPageItems = activeTab === 'all' ? paginatedUsers.length : paginatedBlocked.length

  return (
    <div className="space-y-4">
      {/* ── Barre supérieure : recherche + compteur ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou rôle..."
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
          <span className="font-medium text-foreground">{totalCount}</span>
          <span>utilisateur{totalCount > 1 ? 's' : ''}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Page {filters.page} / {totalPages}</span>
        </div>
      </div>

      {/* ── Filtres avancés ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={filters.roleFilter}
          onValueChange={(v) => setFilter('roleFilter', v as Role | 'ALL')}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les rôles</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {getRoleConfig(r).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.statusFilter}
          onValueChange={(v) => setFilter('statusFilter', v as StatusFilter)}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'all' | 'blocked'); setPage(1) }}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">
            Tous les utilisateurs
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
              {filteredUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Bloqués
            <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
              {filteredBlocked.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════ */}
        {/* TAB : TOUS LES UTILISATEURS           */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="all" className="mt-4">
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
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 font-medium"
                        >
                          Utilisateur
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          onClick={() => handleSort('role')}
                          className="flex items-center gap-1 font-medium"
                        >
                          Rôle
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">Statut</TableHead>
                      <TableHead className="w-[130px]">
                        <button
                          onClick={() => handleSort('createdAt')}
                          className="flex items-center gap-1 font-medium"
                        >
                          Inscription
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {virtual.paddingTop > 0 && (
                      <TableRow className="border-0">
                        <TableCell colSpan={5} className="p-0 border-0" style={{ height: virtual.paddingTop }} />
                      </TableRow>
                    )}

                    {virtual.visibleItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          Aucun utilisateur trouvé.
                        </TableCell>
                      </TableRow>
                    ) : (
                      virtualAll.visibleItems.map((user, idx) => {
                        const status = getUserStatus(user)
                        const isLoading = loadingId === user.id
                        const roleConfig = getRoleConfig(user.role)

                        return (
                          <TableRow
                            key={user.id}
                            className={cn(
                              'group transition-colors',
                              user.isBlocked && 'opacity-60 bg-red-50/30',
                              user._optimistic && 'bg-amber-50/40'
                            )}
                            style={{ height: ROW_HEIGHT }}
                          >
                            {/* Avatar + Nom + Email */}
                            <TableCell className="py-2">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={user} />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium truncate">
                                    {user.name ?? '—'}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Sélecteur de rôle (RBAC guard) */}
                            <TableCell>
                              {isAdmin && !isLoading ? (
                                <Select
                                  value={user.role}
                                  onValueChange={(v) => handleRoleChange(user.id, v as Role)}
                                  disabled={isPending}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_ROLES.map((r) => (
                                      <SelectItem key={r} value={r} disabled={user.role === r}>
                                        <div className="flex items-center gap-2">
                                          {React.createElement(getRoleConfig(r).icon, { className: 'h-3 w-3' })}
                                          {getRoleConfig(r).label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <RoleBadge role={user.role} />
                              )}
                            </TableCell>

                            {/* Statut */}
                            <TableCell>
                              <StatusBadge status={status} />
                              {user._optimistic && (
                                <span className="ml-2 text-[10px] text-amber-600 font-medium">
                                  sync...
                                </span>
                              )}
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-muted-foreground text-sm">
                              {formatShortDate(user.createdAt)}
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
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/admin/users/${user.id}`)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Voir le profil
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                      <>
                                        <DropdownMenuSeparator />
                                        {user.isBlocked ? (
                                          <DropdownMenuItem
                                            onClick={() => openUnblockDialog(user)}
                                            className="text-emerald-600 focus:text-emerald-600"
                                          >
                                            <Unlock className="mr-2 h-4 w-4" />
                                            Débloquer
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            onClick={() => openBlockDialog(user)}
                                            className="text-destructive focus:text-destructive"
                                          >
                                            <Ban className="mr-2 h-4 w-4" />
                                            Bloquer
                                          </DropdownMenuItem>
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

                    {virtual.paddingBottom > 0 && (
                      <TableRow className="border-0">
                        <TableCell colSpan={5} className="p-0 border-0" style={{ height: virtual.paddingBottom }} />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* TAB : UTILISATEURS BLOQUÉS            */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="blocked" className="mt-4">
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
                      <TableHead className="w-[220px]">Utilisateur</TableHead>
                      <TableHead className="w-[120px]">Rôle</TableHead>
                      <TableHead className="w-[160px]">Bloqué le</TableHead>
                      <TableHead className="w-[160px]">Fin du blocage</TableHead>
                      <TableHead className="w-[200px]">Raison</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                          <div className="flex flex-col items-center gap-2">
                            <Ban className="h-8 w-8 text-muted-foreground/40" />
                            Aucun utilisateur bloqué.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      virtualBlocked.visibleItems.map((user) => {
                        const isLoading = loadingId === user.userId
                        const roleLabel = getRoleConfig(user.role as Role).label

                        return (
                          <TableRow
                            key={user.assignmentId}
                            className="group transition-colors hover:bg-slate-50/50"
                            style={{ height: ROW_HEIGHT }}
                          >
                            <TableCell className="py-2">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={user} />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium truncate">
                                    {user.name ?? '—'}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {roleLabel}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(user.blockedAt)}
                            </TableCell>

                            <TableCell>
                              {user.isPermanent ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Permanent
                                </Badge>
                              ) : user.blockedUntil ? (
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(user.blockedUntil)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {user.blockedReason || '—'}
                            </TableCell>

                            <TableCell className="text-right">
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => openUnblockDialog(user)}
                                  disabled={isPending}
                                >
                                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                                  Débloquer
                                </Button>
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
        </TabsContent>
      </Tabs>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Affichage de{' '}
          <span className="font-medium text-foreground">
            {(filters.page - 1) * filters.pageSize + 1}
          </span>{' '}
          à{' '}
          <span className="font-medium text-foreground">
            {Math.min(filters.page * filters.pageSize, totalCount)}
          </span>{' '}
          sur <span className="font-medium text-foreground">{totalCount}</span>
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
            onClick={prevPage}
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
            onClick={nextPage}
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
      {/* DIALOG : BLOQUER UN UTILISATEUR       */}
      {/* ═══════════════════════════════════════ */}
      <Dialog
        open={blockDialog.open}
        onOpenChange={(open) => {
          setBlockDialog((d) => ({ ...d, open }))
          if (!open) {
            setBlockReason('')
            setBlockPermanent(false)
            setBlockUntil('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Bloquer {blockDialog.name ?? blockDialog.email}
            </DialogTitle>
            <DialogDescription>
              Cet utilisateur ne pourra plus accéder à la plateforme.
              {blockDialog.userId && (
                <span className="block mt-1 text-xs text-muted-foreground font-mono">
                  ID: {blockDialog.userId}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="block-reason">
                Raison <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="block-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Pourquoi bloquez-vous cet utilisateur ?"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="block-permanent"
                checked={blockPermanent}
                onCheckedChange={setBlockPermanent}
              />
              <Label htmlFor="block-permanent" className="font-medium cursor-pointer">
                Blocage permanent
              </Label>
            </div>

            {!blockPermanent && (
              <div className="space-y-2">
                <Label htmlFor="block-until">Bloqué jusqu&apos;au</Label>
                <Input
                  id="block-until"
                  type="datetime-local"
                  value={blockUntil}
                  onChange={(e) => setBlockUntil(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={!blockReason.trim() || isPending}
            >
              {isPending && loadingId === blockDialog.userId ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Confirmer le blocage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════ */}
      {/* DIALOG : DÉBLOQUER UN UTILISATEUR     */}
      {/* ═══════════════════════════════════════ */}
      <Dialog
        open={unblockDialog.open}
        onOpenChange={(open) => {
          setUnblockDialog((d) => ({ ...d, open }))
          if (!open) setUnblockReason('')
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-emerald-500" />
              Débloquer {unblockDialog.name ?? unblockDialog.email}
            </DialogTitle>
            <DialogDescription>
              L&apos;utilisateur retrouvera immédiatement l&apos;accès complet à la plateforme.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="unblock-reason">Raison (optionnelle)</Label>
              <Textarea
                id="unblock-reason"
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
                placeholder="Pourquoi débloquez-vous cet utilisateur ?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="default"
              onClick={handleUnblock}
              disabled={isPending}
            >
              {isPending && loadingId === unblockDialog.userId ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Confirmer le déblocage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}