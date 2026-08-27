// store/admin-deleted-account-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// 1. CONSTANTES (Pas de code en dur dans la logique)
// ============================================================================
const API_ENDPOINTS = {
  STATS: '/api/admin/deleted-accounts/stats',
  LIST: '/api/admin/deleted-accounts',
  DETAIL: (id: string) => `/api/admin/deleted-accounts/${id}`,
  RESTORE: (id: string) => `/api/admin/deleted-accounts/${id}/restore`,
  PERMANENT_DELETE: (id: string) => `/api/admin/deleted-accounts/${id}/permanent`,
} as const;

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

// ============================================================================
// 2. TYPES & INTERFACES (Typage strict et maintenable)
// ============================================================================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type DeletionReason = 'USER_REQUEST' | 'TOS_VIOLATION' | 'ADMIN_ACTION' | 'INACTIVITY' | 'OTHER';
export type DeletionStatus = 'PENDING' | 'RESTORED' | 'PERMANENTLY_DELETED';

export interface RegistryStats {
  totalDeleted: number;
  pendingPermanentDeletion: number;
  recentlyRestored: number;
  byReason: Record<DeletionReason | string, number>;
}

export interface DeletedAccountItem {
  id: string; // ID de l'enregistrement de suppression
  userId: string;
  email: string;
  displayName?: string;
  deletedAt: string; // Format ISO 8601
  scheduledPermanentDeletionAt?: string | null; // Format ISO 8601 ou null
  reason: DeletionReason;
  status: DeletionStatus;
}

export interface DeletedAccountDetail extends DeletedAccountItem {
  deletedBy: string; // ID de l'admin ou 'SYSTEM'
  ipAddress?: string;
  userDataSnapshot?: Record<string, unknown>; // Snapshot sanitizé des données utilisateur
  restorationEligible: boolean;
  notes?: string;
}

// ============================================================================
// 3. ÉTAT DU STORE (State)
// ============================================================================
interface AdminDeletedAccountState {
  // Données
  stats: RegistryStats | null;
  items: DeletedAccountItem[];
  selectedItem: DeletedAccountDetail | null;
  pagination: PaginationInfo;

  // État de l'UI
  isLoading: boolean;
  isActionLoading: boolean; // Pour les actions unitaires (restore, delete)
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchItems: (params: { page?: number; limit?: number; status?: DeletionStatus; reason?: DeletionReason }) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  restoreAccount: (id: string) => Promise<boolean>;
  permanentlyDeleteAccount: (id: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// 4. IMPLÉMENTATION DU STORE (Logique robuste et anti-fragile)
// ============================================================================
export const useAdminDeletedAccountStore = create<AdminDeletedAccountState>()(
  devtools(
    (set, get) => ({
      // État initial
      stats: null,
      items: [],
      selectedItem: null,
      pagination: DEFAULT_PAGINATION,
      isLoading: false,
      isActionLoading: false,
      error: null,

      // --- ACTIONS ---

      fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(API_ENDPOINTS.STATS, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
          
          const data: RegistryStats = await response.json();
          set({ stats: data });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Échec du chargement des statistiques';
          set({ error: errorMessage });
          console.error('[AdminDeletedAccountStore] fetchStats:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchItems: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { page = 1, limit = 25, status, reason } = params;
          const searchParams = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            ...(status && { status }),
            ...(reason && { reason }),
          });

          const response = await fetch(`${API_ENDPOINTS.LIST}?${searchParams.toString()}`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
          
          const data = await response.json();
          set({ 
            items: data.items as DeletedAccountItem[],
            pagination: data.pagination as PaginationInfo,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Échec du chargement de la liste';
          set({ error: errorMessage, items: [] });
          console.error('[AdminDeletedAccountStore] fetchItems:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchDetail: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(API_ENDPOINTS.DETAIL(id), { cache: 'no-store' });
          if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
          
          const data: DeletedAccountDetail = await response.json();
          set({ selectedItem: data });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Échec du chargement des détails';
          set({ error: errorMessage, selectedItem: null });
          console.error('[AdminDeletedAccountStore] fetchDetail:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      restoreAccount: async (id: string): Promise<boolean> => {
        set({ isActionLoading: true, error: null });
        try {
          const response = await fetch(API_ENDPOINTS.RESTORE(id), { method: 'POST' });
          if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
          
          // Mise à jour optimiste ou re-fetch ciblé
          const { fetchItems, fetchStats } = get();
          await Promise.all([fetchItems({ page: get().pagination.page }), fetchStats()]);
          
          // Si l'élément sélectionné est celui restauré, on met à jour son statut
          set((state) => ({
            selectedItem: state.selectedItem?.id === id 
              ? { ...state.selectedItem, status: 'RESTORED' as DeletionStatus }
              : state.selectedItem,
          }));
          
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Échec de la restauration du compte';
          set({ error: errorMessage });
          console.error('[AdminDeletedAccountStore] restoreAccount:', error);
          return false;
        } finally {
          set({ isActionLoading: false });
        }
      },

      permanentlyDeleteAccount: async (id: string): Promise<boolean> => {
        set({ isActionLoading: true, error: null });
        try {
          const response = await fetch(API_ENDPOINTS.PERMANENT_DELETE(id), { method: 'DELETE' });
          if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
          
          const { fetchItems, fetchStats } = get();
          await Promise.all([fetchItems({ page: get().pagination.page }), fetchStats()]);
          
          set({ selectedItem: null }); // Fermer le détail après suppression
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Échec de la suppression définitive';
          set({ error: errorMessage });
          console.error('[AdminDeletedAccountStore] permanentlyDeleteAccount:', error);
          return false;
        } finally {
          set({ isActionLoading: false });
        }
      },

      clearError: () => set({ error: null }),

      reset: () => set({
        stats: null,
        items: [],
        selectedItem: null,
        pagination: DEFAULT_PAGINATION,
        isLoading: false,
        isActionLoading: false,
        error: null,
      }),
    }),
    { name: 'AdminDeletedAccountStore' } // Nom pour l'extension Redux DevTools
  )
);