// app/admin/accounts/deleted/page.tsx
// Page admin du registre des comptes supprimés
// ============================================
// Permet aux administrateurs de consulter, rechercher et restaurer
// les comptes supprimés depuis le registre interne.
// ============================================

import { DeletedAccountTable } from "@/components/admin/deleted-account-table";
import {
  listDeletedAccountsAction,
  getDeletedAccountStatsAction,
} from "@/server/actions/deleted-account-admin-actions";
import type { DeletedAccountItem, PaginationInfo, RegistryStats } from "@/store/admin-deleted-account-store";
import { History, Shield } from "lucide-react";

export default async function AdminDeletedAccountsPage() {
  const [entriesRes, statsRes] = await Promise.all([
    listDeletedAccountsAction(1, 25),
    getDeletedAccountStatsAction(),
  ]);

  const entries = entriesRes.success && entriesRes.data
    ? (entriesRes.data as {
        entries: DeletedAccountItem[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      })
    : { entries: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };

  const stats = statsRes.success && statsRes.data
    ? (statsRes.data as RegistryStats)
    : null;

  const pagination: PaginationInfo = {
    total: entries.total,
    page: entries.page,
    pageSize: entries.pageSize,
    totalPages: entries.totalPages,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-slate-700" />
          Registre des comptes supprimés
        </h1>
        <p className="text-slate-500 mt-1">
          Consultez l&apos;historique des suppressions de comptes et restaurez
          les comptes si nécessaire. Un snapshot complet des données est conservé
          pour chaque suppression.
        </p>
      </div>

      <DeletedAccountTable
        initialEntries={entries.entries}
        initialPagination={pagination}
        initialStats={stats}
      />
    </div>
  );
}
