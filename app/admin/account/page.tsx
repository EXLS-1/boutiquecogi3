// app/admin/account/page.tsx
// Page admin de gestion des comptes d'authentification
import { AccountTable } from '@/components/admin/account-table'
import { listAccountsAction, getDistinctProvidersAction } from '@/server/actions/account-admin-actions'
import type { AccountItem, PaginationInfo } from '@/store/admin-account-store'
import { Shield } from 'lucide-react'

export default async function AdminAccountPage() {
  const [accountsRes, providersRes] = await Promise.all([
    listAccountsAction(1, 25),
    getDistinctProvidersAction(),
  ])

  const accounts = accountsRes.success && accountsRes.data
    ? (accountsRes.data as { accounts: AccountItem[]; total: number; page: number; pageSize: number; totalPages: number })
    : { accounts: [], total: 0, page: 1, pageSize: 25, totalPages: 1 }

  const providers = providersRes.success && Array.isArray(providersRes.data)
    ? (providersRes.data as string[])
    : []

  const pagination: PaginationInfo = {
    total: accounts.total,
    page: accounts.page,
    pageSize: accounts.pageSize,
    totalPages: accounts.totalPages,
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-slate-700" />
          Gestion des comptes
        </h1>
        <p className="text-slate-500 mt-1">
          Gérez les comptes d&apos;authentification liés aux utilisateurs.
        </p>
      </div>

      <AccountTable
        initialAccounts={accounts.accounts}
        initialPagination={pagination}
        initialProviders={providers}
      />
    </div>
  )
}

