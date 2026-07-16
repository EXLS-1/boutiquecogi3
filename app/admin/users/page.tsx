// app/admin/users/page.tsx (Server Component)
import { UsersTable } from '@/components/admin/users-table'
import { listUsersAction, listBlockedUsersAction } from '@/server/actions/user-admin-actions'

export default async function AdminUsersPage() {
  const [usersRes, blockedRes] = await Promise.all([
    listUsersAction(),
    listBlockedUsersAction(),
  ])

  return (
    <UsersTable
      initialUsers={usersRes.success ? (usersRes.data as AdminUser[]) : []}
      initialBlockedUsers={blockedRes.success ? (blockedRes.data as BlockedUser[]) : []}
    />
  )
}