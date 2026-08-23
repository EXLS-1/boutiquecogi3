'use client'

import { useMemo } from 'react'
import { Activity, Clock3, ShieldAlert, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UserStatsProps = {
  stats: Array<{ status: string | null; _count: { id: number } }>
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Actifs',
  PENDING: 'En attente',
  BLOCKED: 'Bloques',
}

export function UserStats({ stats }: UserStatsProps) {
  const counts = useMemo(() => {
    const result = { total: 0, active: 0, pending: 0, blocked: 0 }

    for (const item of stats) {
      const count = item._count.id
      result.total += count
      if (item.status === 'ACTIVE') result.active += count
      if (item.status === 'PENDING') result.pending += count
      if (item.status === 'BLOCKED') result.blocked += count
    }

    return result
  }, [stats])

  const cards = [
    { label: 'Total', value: counts.total, icon: Users },
    { label: statusLabels.ACTIVE, value: counts.active, icon: Activity },
    { label: statusLabels.PENDING, value: counts.pending, icon: Clock3 },
    { label: statusLabels.BLOCKED, value: counts.blocked, icon: ShieldAlert },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}