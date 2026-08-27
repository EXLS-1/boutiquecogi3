// components/admin/users/role-manager.tsx

'use client'

import { useState, useTransition } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createRoleAction, deleteRoleAction } from '@/server/actions/role-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type RoleItem = { id: string; name: string; level: number; color?: string | null; isSystem?: boolean }

export function RoleManager({ roles }: { roles: RoleItem[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    const normalizedName = name.trim().toUpperCase().replace(/\s+/g, '_')
    const numericLevel = Number(level)
    if (!/^[A-Z_]{2,50}$/.test(normalizedName) || !Number.isInteger(numericLevel) || numericLevel < 2 || numericLevel > 6) {
      toast.error('Nom ou niveau de rôle invalide')
      return
    }

    const formData = new FormData()
    formData.set('name', normalizedName)
    formData.set('level', String(numericLevel))
    formData.set('description', description.trim())
    formData.set('isActive', 'true')
    formData.set('defaultPermissionCodes', '[]')

    startTransition(async () => {
      const result = await createRoleAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Rôle créé')
      setOpen(false)
      setName('')
      setLevel('')
      setDescription('')
      window.location.reload()
    })
  }

  const remove = (role: RoleItem) => {
    if (role.isSystem) return
    if (!window.confirm(`Supprimer le rôle « ${role.name} » ?`)) return
    startTransition(async () => {
      const result = await deleteRoleAction(role.id)
      if (!result.success) toast.error(result.error)
      else {
        toast.success(result.message ?? 'Rôle supprimé')
        window.location.reload()
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" /> Rôles disponibles</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)} disabled={isPending}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau rôle
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Badge variant="outline">Niveau {role.level}</Badge>
            <span className="text-sm font-medium">{role.name}</span>
            {!role.isSystem && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(role)} disabled={isPending} aria-label={`Supprimer ${role.name}`}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer un rôle</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="role-name">Nom</Label><Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="RESPONSABLE" /></div>
            <div className="grid gap-2"><Label htmlFor="role-level">Niveau (2 à 6)</Label><Input id="role-level" type="number" min={2} max={6} value={level} onChange={(event) => setLevel(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="role-description">Description</Label><Input id="role-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit} disabled={isPending}>{isPending ? 'Enregistrement...' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}