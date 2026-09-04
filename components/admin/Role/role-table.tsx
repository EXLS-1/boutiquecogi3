// components/admin/roles-table.tsx

'use client'

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useRBAC } from '@/lib/auth/auth-client';
import {
    getRoleConfig,
    getRoleLevel,
    ROLES,
    type Role
} from '@/lib/auth/rbac-shared';
import {
    createRoleAction,
    deleteRoleAction,
    updateRoleAction,
    listRolesAction
} from '@/server/actions/role-actions';
import {
    Crown,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Shield,
    Trash2,
    Users,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Filter,
    X,
    CheckCircle2,
    Ban,
    Eye,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

type RoleLevelOption = {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
};

// ─── Types ───

interface PermissionItem {
    code: string
    name: string
    category: string
    description: string
    minLevel: number
    isDangerous: boolean
}

interface RoleTableItem {
    id: string
    name: string
    level: number
    description: string | null
    isActive: boolean
    userCount: number
    permissions: { code: string; name: string }[]
    restrictions?: Record<string, string | boolean>
    createdAt?: Date | string
    updatedAt?: Date | string
}

interface RolesTableProps {
    initialRoles: RoleTableItem[]
}

interface FilterState {
    search: string
    level: string | 'all'
    status: 'all' | 'active' | 'inactive'
    category: string | 'all'
}

// ─── Constants ───

const ITEMS_PER_PAGE = 10

const ROLE_LEVELS: RoleLevelOption[] = [
    { value: '1', label: '1 — Super Admin', disabled: true },
    { value: '2', label: '2 — Admin' },
    { value: '3', label: '3 — Manager' },
    { value: '4', label: '4 — Éditeur' },
    { value: '5', label: '5 — Superviseur' },
    { value: '6', label: '6 — Utilisateur' },
    { value: '7', label: '7 — Invité', disabled: true },
]

// ─── Composant Principal ───

export function RolesTable({ initialRoles }: RolesTableProps) {
    const router = useRouter()
    const { role: currentRole, isAdmin } = useRBAC()
    const currentLevel = getRoleLevel(currentRole)

    // ─── États ───
    const [roles, setRoles] = React.useState<RoleTableItem[]>(initialRoles)
    const [loading, setLoading] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    // Filtres
    const [filters, setFilters] = React.useState<FilterState>({
        search: '',
        level: 'all',
        status: 'all',
        category: 'all',
    })
    const [showFilters, setShowFilters] = React.useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1)

    // Reset la page quand les filtres changent (sans setState synchrone dans un effet)
    const updateFilters = (updater: (f: FilterState) => FilterState) => {
        setFilters(updater)
        setCurrentPage(1)
    }

    // Dialogs
    const [detailRole, setDetailRole] = React.useState<RoleTableItem | null>(null)
    const [detailOpen, setDetailOpen] = React.useState(false)

    const [editRole, setEditRole] = React.useState<RoleTableItem | null>(null)
    const [editOpen, setEditOpen] = React.useState(false)

    const [deleteRole, setDeleteRole] = React.useState<RoleTableItem | null>(null)
    const [deleteOpen, setDeleteOpen] = React.useState(false)

    const [createOpen, setCreateOpen] = React.useState(false)

    // Form création
    const [createForm, setCreateForm] = React.useState({
        name: '',
        level: '',
        description: '',
        isActive: true,
        selectedPermissions: [] as string[],
    })
    const [createErrors, setCreateErrors] = React.useState<Record<string, string>>({})

    // Form édition
    const [editForm, setEditForm] = React.useState({
        description: '',
        isActive: true,
        selectedPermissions: [] as string[],
    })

    // ─── Permissions disponibles (mock depuis rbac) ───
    const allPermissions = React.useMemo(() => {
        const perms: PermissionItem[] = []
        const categories = new Set<string>()

        // Extraction depuis les permissions RBAC
        const permissionEntries = Object.entries({
            'users:read': { category: 'USER', minLevel: 1, isDangerous: false, description: 'Lire les utilisateurs' },
            'users:create': { category: 'USER', minLevel: 2, isDangerous: false, description: 'Créer un utilisateur' },
            'users:update': { category: 'USER', minLevel: 2, isDangerous: false, description: 'Modifier un utilisateur' },
            'users:delete': { category: 'USER', minLevel: 1, isDangerous: true, description: 'Supprimer un utilisateur' },
            'users:block': { category: 'USER', minLevel: 2, isDangerous: true, description: 'Bloquer un utilisateur' },
            'role:view': { category: 'ROLE', minLevel: 2, isDangerous: false, description: 'Voir les rôles' },
            'role:create': { category: 'ROLE', minLevel: 1, isDangerous: true, description: 'Créer un rôle' },
            'role:edit': { category: 'ROLE', minLevel: 1, isDangerous: true, description: 'Modifier un rôle' },
            'role:delete': { category: 'ROLE', minLevel: 1, isDangerous: true, description: 'Supprimer un rôle' },
            'role:assign': { category: 'ROLE', minLevel: 2, isDangerous: true, description: 'Assigner un rôle' },
            'products:read': { category: 'PRODUCT', minLevel: 1, isDangerous: false, description: 'Voir les produits' },
            'products:create': { category: 'PRODUCT', minLevel: 3, isDangerous: false, description: 'Créer un produit' },
            'products:update': { category: 'PRODUCT', minLevel: 3, isDangerous: false, description: 'Modifier un produit' },
            'products:delete': { category: 'PRODUCT', minLevel: 6, isDangerous: true, description: 'Supprimer un produit' },
            'orders:read': { category: 'ORDER', minLevel: 1, isDangerous: false, description: 'Voir les commandes' },
            'orders:update': { category: 'ORDER', minLevel: 4, isDangerous: false, description: 'Modifier une commande' },
            'orders:cancel': { category: 'ORDER', minLevel: 4, isDangerous: false, description: 'Annuler une commande' },
            'analytics:read': { category: 'ANALYTICS', minLevel: 3, isDangerous: false, description: 'Voir les analytics' },
            'analytics:export': { category: 'ANALYTICS', minLevel: 5, isDangerous: false, description: 'Exporter les analytics' },
            'settings:read': { category: 'SETTINGS', minLevel: 1, isDangerous: false, description: 'Voir les paramètres' },
            'settings:update': { category: 'SETTINGS', minLevel: 2, isDangerous: false, description: 'Modifier les paramètres' },
            'media:upload': { category: 'MEDIA', minLevel: 3, isDangerous: false, description: 'Uploader des médias' },
            'media:delete': { category: 'MEDIA', minLevel: 4, isDangerous: false, description: 'Supprimer des médias' },
            'system:logs': { category: 'SYSTEM', minLevel: 2, isDangerous: false, description: 'Voir les logs' },
            'system:maintenance': { category: 'SYSTEM', minLevel: 1, isDangerous: true, description: 'Maintenance système' },
            'content:read': { category: 'CONTENT', minLevel: 1, isDangerous: false, description: 'Voir le contenu' },
            'content:create': { category: 'CONTENT', minLevel: 3, isDangerous: false, description: 'Créer du contenu' },
            'content:update': { category: 'CONTENT', minLevel: 3, isDangerous: false, description: 'Modifier du contenu' },
            'content:delete': { category: 'CONTENT', minLevel: 5, isDangerous: true, description: 'Supprimer du contenu' },
            'finance:read:own': { category: 'FINANCE', minLevel: 1, isDangerous: false, description: 'Voir ses transactions' },
            'finance:read:any': { category: 'FINANCE', minLevel: 5, isDangerous: false, description: 'Voir toutes les transactions' },
            'audit:switch-self': { category: 'AUDIT', minLevel: 2, isDangerous: false, description: 'Audit soi-même' },
            'audit:switch-others': { category: 'AUDIT', minLevel: 1, isDangerous: true, description: "Audit d'autres" },
            'audit:approve-request': { category: 'AUDIT', minLevel: 1, isDangerous: true, description: 'Approuver une requête' },
            'audit:view-logs': { category: 'AUDIT', minLevel: 2, isDangerous: false, description: 'Voir les logs' },
        })

        permissionEntries.forEach(([code, meta]) => {
            perms.push({
                code,
                name: code.split(':').pop()?.toUpperCase() || code,
                category: meta.category,
                description: meta.description,
                minLevel: meta.minLevel,
                isDangerous: meta.isDangerous,
            })
            categories.add(meta.category)
        })

        return { perms, categories: Array.from(categories).sort() }
    }, [])

    // ─── Filtrage et Pagination ───
    const filteredRoles = React.useMemo(() => {
        let data = [...roles]

        if (filters.search.trim()) {
            const q = filters.search.toLowerCase()
            data = data.filter(
                (r) =>
                    r.name.toLowerCase().includes(q) ||
                    r.description?.toLowerCase().includes(q) ||
                    r.permissions.some((p) => p.code.toLowerCase().includes(q))
            )
        }

        if (filters.level !== 'all') {
            data = data.filter((r) => r.level === Number(filters.level))
        }

        if (filters.status !== 'all') {
            data = data.filter((r) =>
                filters.status === 'active' ? r.isActive : !r.isActive
            )
        }

        // Tri par niveau hiérarchique
        data.sort((a, b) => a.level - b.level)

        return data
    }, [roles, filters])

    const totalPages = Math.max(1, Math.ceil(filteredRoles.length / ITEMS_PER_PAGE))
    const paginatedRoles = filteredRoles.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // ─── Helpers ───
    const isImmutable = (level: number) =>
        level === getRoleLevel(ROLES.SUPER_ADMIN) || level === getRoleLevel(ROLES.GUEST)
    const canModify = (level: number) => !isImmutable(level) && level > currentLevel
    const canDelete = (role: RoleTableItem) =>
        !isImmutable(role.level) && role.level > currentLevel && role.userCount === 0

    // ─── Handlers ───

    const refreshRoles = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await listRolesAction()
            if (res.success) {
                setRoles(res.data as RoleTableItem[])
            } else {
                setError(res.error)
            }
        } catch {
            setError('Erreur lors du rafraîchissement')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateErrors({})

        // Validation
        const errors: Record<string, string> = {}
        if (!createForm.name.trim()) errors.name = 'Le nom est requis'
        if (!createForm.level) errors.level = 'Le niveau est requis'
        if (Number(createForm.level) <= currentLevel) {
            errors.level = 'Vous ne pouvez créer un rôle qu\'inférieur au vôtre'
        }

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors)
            return
        }

        setActionLoading('create')
        try {
            const fd = new FormData()
            fd.append('name', createForm.name.toUpperCase().replace(/\s+/g, '_'))
            fd.append('level', createForm.level)
            fd.append('description', createForm.description)
            fd.append('isActive', createForm.isActive ? 'true' : 'false')
            fd.append('defaultPermissionCodes', JSON.stringify(createForm.selectedPermissions))

            const res = await createRoleAction(fd)
            if (res.success) {
                setCreateOpen(false)
                setCreateForm({
                    name: '',
                    level: '',
                    description: '',
                    isActive: true,
                    selectedPermissions: [],
                })
                await refreshRoles()
                router.refresh()
            } else {
                setCreateErrors({ submit: res.error })
            }
        } catch {
            setCreateErrors({ submit: 'Erreur lors de la création' })
        } finally {
            setActionLoading(null)
        }
    }

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editRole) return

        setActionLoading('edit')
        try {
            const fd = new FormData()
            fd.append('description', editForm.description)
            fd.append('isActive', editForm.isActive ? 'true' : 'false')
            fd.append('defaultPermissionCodes', JSON.stringify(editForm.selectedPermissions))

            const res = await updateRoleAction(editRole.id, fd)
            if (res.success) {
                setEditOpen(false)
                setEditRole(null)
                await refreshRoles()
                router.refresh()
            } else {
                setError(res.error)
            }
        } catch {
            setError('Erreur lors de la modification')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDelete = async () => {
        if (!deleteRole) return

        setActionLoading('delete')
        try {
            const res = await deleteRoleAction(deleteRole.id)
            if (res.success) {
                setDeleteOpen(false)
                setDeleteRole(null)
                await refreshRoles()
                router.refresh()
            } else {
                setError(res.error)
            }
        } catch {
            setError('Erreur lors de la suppression')
        } finally {
            setActionLoading(null)
        }
    }

    const openEdit = (role: RoleTableItem) => {
        setEditRole(role)
        setEditForm({
            description: role.description || '',
            isActive: role.isActive,
            selectedPermissions: role.permissions.map((p) => p.code),
        })
        setEditOpen(true)
    }

    const openDelete = (role: RoleTableItem) => {
        setDeleteRole(role)
        setDeleteOpen(true)
    }

    const openDetail = (role: RoleTableItem) => {
        setDetailRole(role)
        setDetailOpen(true)
    }

    const togglePermission = (code: string, isCreate: boolean) => {
        if (isCreate) {
            setCreateForm((prev) => ({
                ...prev,
                selectedPermissions: prev.selectedPermissions.includes(code)
                    ? prev.selectedPermissions.filter((p) => p !== code)
                    : [...prev.selectedPermissions, code],
            }))
        } else {
            setEditForm((prev) => ({
                ...prev,
                selectedPermissions: prev.selectedPermissions.includes(code)
                    ? prev.selectedPermissions.filter((p) => p !== code)
                    : [...prev.selectedPermissions, code],
            }))
        }
    }

    // ─── Rendu ───

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Gestion des rôles</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {filteredRoles.length} rôle(s) • Hiérarchie Level 1-7
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(showFilters && 'bg-muted')}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filtres
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setCreateOpen(true)}
                            disabled={!isAdmin}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nouveau rôle
                        </Button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-700">{error}</p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-red-700"
                            onClick={() => setError(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Filtres */}
                {showFilters && (
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher..."
                                    value={filters.search}
                                    onChange={(e) =>
                                        updateFilters((f) => ({ ...f, search: e.target.value }))
                                    }
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={filters.level}
                                onValueChange={(v) => updateFilters((f) => ({ ...f, level: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Niveau" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les niveaux</SelectItem>
                                    {ROLE_LEVELS.map((l) => (
                                        <SelectItem
                                            key={l.value}
                                            value={l.value}
                                            disabled={l.disabled ?? false}
                                        >
                                            {l.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.status}
                                onValueChange={(v) =>
                                    updateFilters((f) => ({ ...f, status: v as FilterState['status'] }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="active">Actif</SelectItem>
                                    <SelectItem value="inactive">Inactif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[60px]">Niv.</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead className="hidden lg:table-cell">Description</TableHead>
                                <TableHead className="text-center w-[100px]">Users</TableHead>
                                <TableHead className="hidden md:table-cell">Permissions</TableHead>
                                <TableHead className="w-[80px]">Statut</TableHead>
                                <TableHead className="w-[80px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRoles.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Aucun rôle ne correspond aux critères.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRoles.map((role) => {
                                    const config = getRoleConfig(role.name as Role)
                                    const RoleIcon = config.icon
                                    const immutable = isImmutable(role.level)
                                    const isAboveMe = role.level < currentLevel
                                    const canEdit = canModify(role.level)
                                    const canDel = canDelete(role)

                                    return (
                                        <TableRow
                                            key={role.id}
                                            className={cn(
                                                'group transition-colors',
                                                !role.isActive && 'opacity-50',
                                                isAboveMe && 'bg-amber-50/30'
                                            )}
                                        >
                                            {/* Niveau */}
                                            <TableCell>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-xs',
                                                                config.bgClass,
                                                                config.textClass
                                                            )}
                                                        >
                                                            {role.level}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{config.label}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>

                                            {/* Nom */}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <RoleIcon
                                                        className="h-4 w-4"
                                                        style={{ color: config.color }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm">
                                                            {role.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    {immutable && (
                                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                    {isAboveMe && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Rôle supérieur au vôtre</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Description */}
                                            <TableCell className="hidden lg:table-cell">
                                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                                                    {role.description || '—'}
                                                </span>
                                            </TableCell>

                                            {/* Users */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span
                                                        className={cn(
                                                            'text-sm font-mono',
                                                            role.userCount > 0 && 'font-semibold'
                                                        )}
                                                    >
                                                        {role.userCount}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Permissions */}
                                            <TableCell className="hidden md:table-cell">
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions.slice(0, 3).map((p) => (
                                                        <Badge
                                                            key={p.code}
                                                            variant="secondary"
                                                            className="text-[10px] font-normal px-1.5 py-0"
                                                        >
                                                            {p.code.split(':').pop()}
                                                        </Badge>
                                                    ))}
                                                    {role.permissions.length > 3 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] cursor-pointer hover:bg-muted px-1.5 py-0"
                                                            onClick={() => openDetail(role)}
                                                        >
                                                            +{role.permissions.length - 3}
                                                        </Badge>
                                                    )}
                                                    {role.permissions.length === 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Aucune
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Statut */}
                                            <TableCell>
                                                {role.isActive ? (
                                                    <Badge
                                                        variant="default"
                                                        className="bg-green-600 hover:bg-green-700 text-[10px]"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Actif
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        <Ban className="h-3 w-3 mr-1" />
                                                        Inactif
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                {actionLoading === role.id ? (
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
                                                            <DropdownMenuItem onClick={() => openDetail(role)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Voir détails
                                                            </DropdownMenuItem>
                                                            {canEdit && (
                                                                <DropdownMenuItem onClick={() => openEdit(role)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Modifier
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDel && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => openDelete(role)}
                                                                        className="text-destructive focus:text-destructive"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Supprimer
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {!canEdit && !immutable && (
                                                                <DropdownMenuItem disabled>
                                                                    <Lock className="mr-2 h-4 w-4" />
                                                                    Protégé (niveau)
                                                                </DropdownMenuItem>
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {currentPage} sur {totalPages} •{' '}
                            {filteredRoles.length} résultat(s)
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ─── Dialog: Création ─── */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Créer un nouveau rôle
                            </DialogTitle>
                            <DialogDescription>
                                Définissez le niveau hiérarchique, les permissions et les restrictions.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-name">
                                        Nom <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="create-name"
                                        value={createForm.name}
                                        onChange={(e) =>
                                            setCreateForm((f) => ({
                                                ...f,
                                                name: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                                            }))
                                        }
                                        placeholder="EX: MODERATEUR"
                                        className={cn(createErrors.name && 'border-red-500')}
                                    />
                                    {createErrors.name && (
                                        <p className="text-xs text-red-500">{createErrors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-level">
                                        Niveau <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={createForm.level}
                                        onValueChange={(v) =>
                                            setCreateForm((f) => ({ ...f, level: v }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={cn(createErrors.level && 'border-red-500')}
                                        >
                                            <SelectValue placeholder="Choisir..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLE_LEVELS.filter((l) => !l.disabled && Number(l.value) > currentLevel).map(
                                                (l) => (
                                                    <SelectItem key={l.value} value={l.value}>
                                                        {l.label}
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {createErrors.level && (
                                        <p className="text-xs text-red-500">{createErrors.level}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-description">Description</Label>
                                <Textarea
                                    id="create-description"
                                    value={createForm.description}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, description: e.target.value }))
                                    }
                                    placeholder="Rôle responsable de la modération..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    id="create-active"
                                    checked={createForm.isActive}
                                    onCheckedChange={(v) =>
                                        setCreateForm((f) => ({ ...f, isActive: v }))
                                    }
                                />
                                <Label htmlFor="create-active">Rôle actif</Label>
                            </div>

                            {/* Permissions */}
                            <div className="space-y-3">
                                <Label>Permissions ({createForm.selectedPermissions.length})</Label>
                                <div className="border rounded-lg p-4 space-y-4 max-h-[300px] overflow-y-auto">
                                    {allPermissions.categories.map((cat) => (
                                        <div key={cat}>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                {cat}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {allPermissions.perms
                                                    .filter((p) => p.category === cat)
                                                    .map((perm) => (
                                                        <div
                                                            key={perm.code}
                                                            className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                                        >
                                                            <Checkbox
                                                                id={`create-${perm.code}`}
                                                                checked={createForm.selectedPermissions.includes(
                                                                    perm.code
                                                                )}
                                                                onCheckedChange={() =>
                                                                    togglePermission(perm.code, true)
                                                                }
                                                            />
                                                            <Label
                                                                htmlFor={`create-${perm.code}`}
                                                                className="text-xs leading-tight cursor-pointer flex-1"
                                                            >
                                                                <span className="font-medium flex items-center gap-1">
                                                                    {perm.code}
                                                                    {perm.isDangerous && (
                                                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                                    )}
                                                                </span>
                                                                <span className="text-muted-foreground block">
                                                                    {perm.description}
                                                                </span>
                                                            </Label>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {createErrors.submit && (
                                <p className="text-sm text-red-500">{createErrors.submit}</p>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateOpen(false)}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={actionLoading === 'create'}>
                                    {actionLoading === 'create' ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Shield className="h-4 w-4 mr-2" />
                                    )}
                                    Créer le rôle
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── Dialog: Édition ─── */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                Modifier {editRole?.name}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEdit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, description: e.target.value }))
                                    }
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={editForm.isActive}
                                    onCheckedChange={(v) =>
                                        setEditForm((f) => ({ ...f, isActive: v }))
                                    }
                                />
                                <Label>Rôle actif</Label>
                            </div>

                            <div className="space-y-3">
                                <Label>Permissions ({editForm.selectedPermissions.length})</Label>
                                <div className="border rounded-lg p-4 space-y-4 max-h-[300px] overflow-y-auto">
                                    {allPermissions.categories.map((cat) => (
                                        <div key={cat}>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                {cat}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {allPermissions.perms
                                                    .filter((p) => p.category === cat)
                                                    .map((perm) => (
                                                        <div
                                                            key={perm.code}
                                                            className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50"
                                                        >
                                                            <Checkbox
                                                                id={`edit-${perm.code}`}
                                                                checked={editForm.selectedPermissions.includes(
                                                                    perm.code
                                                                )}
                                                                onCheckedChange={() =>
                                                                    togglePermission(perm.code, false)
                                                                }
                                                            />
                                                            <Label
                                                                htmlFor={`edit-${perm.code}`}
                                                                className="text-xs leading-tight cursor-pointer flex-1"
                                                            >
                                                                <span className="font-medium flex items-center gap-1">
                                                                    {perm.code}
                                                                    {perm.isDangerous && (
                                                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                                    )}
                                                                </span>
                                                                <span className="text-muted-foreground block">
                                                                    {perm.description}
                                                                </span>
                                                            </Label>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditOpen(false)}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={actionLoading === 'edit'}>
                                    {actionLoading === 'edit' ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Pencil className="h-4 w-4 mr-2" />
                                    )}
                                    Enregistrer
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── Dialog: Suppression ─── */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <Trash2 className="h-5 w-5" />
                                Confirmer la suppression
                            </DialogTitle>
                            <DialogDescription>
                                Le rôle <strong>{deleteRole?.name}</strong> sera définitivement
                                supprimé. Cette action est irréversible.
                            </DialogDescription>
                        </DialogHeader>
                        {deleteRole && (
                            <div className="rounded-lg bg-muted p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Niveau</span>
                                    <span className="font-mono font-semibold">
                                        {deleteRole.level}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Utilisateurs</span>
                                    <span className="font-mono font-semibold">
                                        {deleteRole.userCount}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Permissions</span>
                                    <span className="font-mono font-semibold">
                                        {deleteRole.permissions.length}
                                    </span>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteOpen(false)}
                                disabled={actionLoading === 'delete'}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={actionLoading === 'delete'}
                            >
                                {actionLoading === 'delete' ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Supprimer définitivement
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ─── Dialog: Détails ─── */}
                <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                {detailRole && (
                                    <>
                                        {React.createElement(
                                            getRoleConfig(detailRole.name as Role).icon,
                                            {
                                                className: 'h-6 w-6',
                                                style: { color: getRoleConfig(detailRole.name as Role).color },
                                            }
                                        )}
                                        <div className="flex flex-col">
                                            <span>{detailRole.name}</span>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                {getRoleConfig(detailRole.name as Role).label} • Niveau{' '}
                                                {detailRole.level}
                                            </span>
                                        </div>
                                        <Badge
                                            variant={detailRole?.isActive ? 'default' : 'secondary'}
                                            className={cn(
                                                detailRole?.isActive && 'bg-green-600 hover:bg-green-700'
                                            )}
                                        >
                                            {detailRole?.isActive ? 'Actif' : 'Inactif'}
                                        </Badge>
                                    </>
                                )}
                            </DialogTitle>
                            <DialogDescription>
                                {detailRole?.description || 'Aucune description'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-lg border p-3 text-center">
                                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-2xl font-bold">{detailRole?.userCount}</p>
                                    <p className="text-xs text-muted-foreground">Utilisateur(s)</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                    <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-2xl font-bold">
                                        {detailRole?.permissions.length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Permissions</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                    <Crown className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-2xl font-bold">{detailRole?.level}</p>
                                    <p className="text-xs text-muted-foreground">Hiérarchie</p>
                                </div>
                            </div>

                            {/* Permissions détaillées */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Permissions ({detailRole?.permissions.length})
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {detailRole?.permissions.map((p) => {
                                        const permMeta = allPermissions.perms.find(
                                            (ap) => ap.code === p.code
                                        )
                                        return (
                                            <div
                                                key={p.code}
                                                className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{p.code}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {permMeta?.description || p.name}
                                                    </p>
                                                    {permMeta?.isDangerous && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] text-amber-600 border-amber-200 mt-1"
                                                        >
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Dangereux
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Hiérarchie visuelle */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3">Position hiérarchique</h4>
                                <div className="flex items-center gap-1">
                                    {ROLE_LEVELS.map((l) => {
                                        const isCurrent = Number(l.value) === detailRole?.level
                                        const isAbove = Number(l.value) < (detailRole?.level || 0)
                                        return (
                                            <div
                                                key={l.value}
                                                className={cn(
                                                    'flex-1 h-2 rounded-full transition-colors',
                                                    isCurrent
                                                        ? 'bg-primary'
                                                        : isAbove
                                                            ? 'bg-primary/30'
                                                            : 'bg-muted'
                                                )}
                                                title={l.label}
                                            />
                                        )
                                    })}
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>Super Admin</span>
                                    <span>Invité</span>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
