'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Download, Search, Shield, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { assignRoleAction, blockUserAction, unblockUserAction } from '@/server/actions/user-admin-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type UserItem = { id: string; email: string; name: string | null; createdAt: Date | string; emailVerified: boolean; role: { id: string; name: string; level: number; color?: string | null }; _count: { orders: number } }
type RoleItem = { id: string; name: string; level: number; color?: string | null; isSystem?: boolean }

type UsersTableProps = {
  users: UserItem[]
  total: number
  page: number
  limit: number
  roles: RoleItem[]
  currentUserLevel: number
  canUpdate: boolean
  canDelete: boolean
  canBan: boolean
  canManageRoles: boolean
  canImpersonate: boolean
  canExport: boolean
}

export function UsersTable({ users, total, page, limit, roles, currentUserLevel, canUpdate, canDelete, canBan, canManageRoles, canImpersonate, canExport }: UsersTableProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const filtered = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.name ?? ''} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (roleFilter === 'all' || user.role.id === roleFilter)
  }), [users, query, roleFilter])
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const mutate = (userId: string, action: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setBusyId(userId)
    startTransition(async () => {
      const result = await action()
      if (!result.success) toast.error(result.error ?? 'Action impossible')
      else { toast.success(result.message ?? 'Modification enregistrée'); window.location.reload() }
      setBusyId(null)
    })
  }

  const changeRole = (user: UserItem, roleId: string) => {
    const role = roles.find((item) => item.id === roleId)
    if (!role || role.level < currentUserLevel || user.role.level === 1) return
    if (!window.confirm(`Attribuer le rôle « ${role.name} » à ${user.email} ?`)) return
    mutate(user.id, () => assignRoleAction(user.id, role.id))
  }

  const block = (user: UserItem) => {
    const reason = window.prompt('Motif du blocage (5 caractères minimum)')
    if (!reason) return
    const formData = new FormData()
    formData.set('userId', user.id); formData.set('reason', reason); formData.set('permanent', 'true')
    mutate(user.id, () => blockUserAction(formData))
  }

  const exportCsv = () => {
    const csv = ['Nom,Email,Rôle,Commandes', ...filtered.map((user) => [user.name ?? '', user.email, user.role.name, user._count.orders].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'utilisateurs.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un utilisateur..." /></div><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous les rôles" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les rôles</SelectItem>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></div>
        {canExport && <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Exporter</Button>}
      </div>
      <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôle</TableHead><TableHead>Inscription</TableHead><TableHead>Commandes</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun utilisateur trouvé.</TableCell></TableRow> : filtered.map((user) => <TableRow key={user.id}><TableCell><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><UserRound className="h-4 w-4" /></div><div><div className="font-medium">{user.name || 'Sans nom'}</div><div className="text-xs text-muted-foreground">{user.email}</div></div></div></TableCell><TableCell><Select value={user.role.id} onValueChange={(value) => changeRole(user, value)} disabled={!canUpdate || !canManageRoles || user.role.level === 1 || isPending}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{roles.filter((role) => role.level >= currentUserLevel && role.level !== 1).map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></TableCell><TableCell>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</TableCell><TableCell>{user._count.orders}</TableCell><TableCell>{user.emailVerified ? <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> Vérifié</Badge> : <Badge variant="secondary">En attente</Badge>}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1">{canBan && <Button variant="ghost" size="icon" onClick={() => block(user)} disabled={isPending || busyId === user.id} aria-label={`Bloquer ${user.email}`}><Ban className="h-4 w-4 text-destructive" /></Button>}{canDelete && <Button variant="ghost" size="icon" onClick={() => toast.info('La suppression doit être confirmée par le workflow serveur')} aria-label={`Supprimer ${user.email}`}><Shield className="h-4 w-4" /></Button>}{canImpersonate && <Button variant="ghost" size="icon" onClick={() => toast.info('Impersonation disponible via le workflow sécurisé')} aria-label={`Usurper ${user.email}`}><UserRound className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}</TableBody></Table></div>
      <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{filtered.length} affiché(s) sur {total}</span><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => router.push(`?page=${Math.max(1, page - 1)}`)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button><span className="flex items-center px-2">Page {page} / {totalPages}</span><Button variant="outline" size="icon" onClick={() => router.push(`?page=${Math.min(totalPages, page + 1)}`)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button></div></div>
    </div>
  )
}