'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useRBAC } from '@/lib/auth/auth-client'
import { getRoleConfig, type Role } from '@/lib/auth/rbac-shared'
import {
  blockUserAction,
  unblockUserAction,
  updateUserRole,
} from '@/server/actions/user-admin-actions'
import {
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Shield,
  Search,
  Loader2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// ─── Types ───

interface UserTableItem {
  id: string
  name: string | null
  email: string
  role: Role
  emailVerified: boolean | null
  image: string | null
  isBlocked: boolean
  blockedUntil?: Date | null
  createdAt: Date | string
}

interface UsersTableProps {
  users: UserTableItem[]
}

// ─── Composant ───

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const { isAdmin } = useRBAC()
  const [search, setSearch] = React.useState('')
  const [loadingId, setLoadingId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [users, search])

  const handleBlock = async (userId: string) => {
    if (!confirm('Bloquer cet utilisateur ?')) return
    setLoadingId(userId)
    const fd = new FormData()
    fd.append('userId', userId)
    fd.append('reason', 'Action admin depuis le tableau')
    fd.append('permanent', 'false')
    const res = await blockUserAction(fd)
    setLoadingId(null)
    if (res.success) router.refresh()
    else alert(res.error)
  }

  const handleUnblock = async (userId: string) => {
    setLoadingId(userId)
    const fd = new FormData()
    fd.append('userId', userId)
    fd.append('reason', 'Débloqué depuis le tableau')
    const res = await unblockUserAction(fd)
    setLoadingId(null)
    if (res.success) router.refresh()
    else alert(res.error)
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!confirm(`Assigner le rôle « ${newRole} » ?`)) return
    setLoadingId(userId)
    const res = await updateUserRole(userId, newRole)
    setLoadingId(null)
    if (res.success) router.refresh()
    else alert(res.error)
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email ou rôle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} utilisateur(s)
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const roleConfig = getRoleConfig(user.role)
                const RoleIcon = roleConfig.icon
                const isLoading = loadingId === user.id

                return (
                  <TableRow
                    key={user.id}
                    className={cn(user.isBlocked && 'opacity-60')}
                  >
                    {/* Nom + Email */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.image ?? ''}
                            alt={user.name ?? ''}
                          />
                          <AvatarFallback>
                            {user.name?.charAt(0).toUpperCase() ??
                              user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.name ?? '—'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Badge Rôle (couleur RBAC) */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1 font-normal',
                          roleConfig.bgClass,
                          roleConfig.textClass,
                          roleConfig.borderClass,
                        )}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </Badge>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      {user.isBlocked ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Bloqué
                        </Badge>
                      ) : user.emailVerified ? (
                        <Badge
                          variant="default"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
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
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isAdmin && (
                              <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Changer de rôle
                                </DropdownMenuLabel>
                                {(
                                  [
                                    'SUPER_ADMIN',
                                    'ADMIN',
                                    'MANAGER',
                                    'EDITOR',
                                    'SUPERVISOR',
                                    'USER',
                                    'GUEST',
                                  ] as Role[]
                                ).map((r) => (
                                  <DropdownMenuItem
                                    key={r}
                                    disabled={user.role === r}
                                    onClick={() =>
                                      handleRoleChange(user.id, r)
                                    }
                                  >
                                    Passer {r}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                {user.isBlocked ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUnblock(user.id)}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Débloquer
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleBlock(user.id)}
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
          </TableBody>
        </Table>
      </div>
    </div>
  )
}