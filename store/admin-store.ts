// store/admin-store.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ─── Types ───

export interface AdminUser {
    id: string
    email: string | null
    name: string | null
    createdAt: Date | string
    role: string
    roleLevel: number
    isBlocked: boolean
}

export interface AdminRole {
    id: string
    name: string
    level: number
    description: string | null
    isActive: boolean
    userCount: number
    permissions: { code: string; name: string }[]
}

export interface BlockedUser {
    assignmentId: string
    userId: string
    email: string | null
    name: string | null
    role: string
    roleLevel: number
    blockedAt: Date | string | null
    blockedUntil: Date | string | null
    blockedReason: string | null
    isPermanent: boolean
}

interface AdminState {
    // Users
    users: AdminUser[]
    blockedUsers: BlockedUser[]
    isLoadingUsers: boolean
    isLoadingBlocked: boolean
    usersError: string | null
    blockedError: string | null

    // Roles
    roles: AdminRole[]
    isLoadingRoles: boolean
    rolesError: string | null

    // Actions
    setUsers: (users: AdminUser[]) => void
    setBlockedUsers: (users: BlockedUser[]) => void
    setRoles: (roles: AdminRole[]) => void
    setLoadingUsers: (loading: boolean) => void
    setLoadingBlocked: (loading: boolean) => void
    setLoadingRoles: (loading: boolean) => void
    setUsersError: (error: string | null) => void
    setBlockedError: (error: string | null) => void
    setRolesError: (error: string | null) => void

    // Optimistic updates
    updateUserRole: (userId: string, role: string, roleLevel: number) => void
    blockUserOptimistic: (userId: string) => void
    unblockUserOptimistic: (userId: string) => void
    addRole: (role: AdminRole) => void
    removeRole: (roleId: string) => void
}

export const useAdminStore = create<AdminState>()(
    devtools(
        (set) => ({
            // Initial state
            users: [],
            blockedUsers: [],
            roles: [],
            isLoadingUsers: false,
            isLoadingBlocked: false,
            isLoadingRoles: false,
            usersError: null,
            blockedError: null,
            rolesError: null,

            // Setters
            setUsers: (users) => set({ users }),
            setBlockedUsers: (blockedUsers) => set({ blockedUsers }),
            setRoles: (roles) => set({ roles }),
            setLoadingUsers: (isLoadingUsers) => set({ isLoadingUsers }),
            setLoadingBlocked: (isLoadingBlocked) => set({ isLoadingBlocked }),
            setLoadingRoles: (isLoadingRoles) => set({ isLoadingRoles }),
            setUsersError: (usersError) => set({ usersError }),
            setBlockedError: (blockedError) => set({ blockedError }),
            setRolesError: (rolesError) => set({ rolesError }),

            // Optimistic updates
            updateUserRole: (userId, role, roleLevel) =>
                set((state) => ({
                    users: state.users.map((u) =>
                        u.id === userId ? { ...u, role, roleLevel } : u
                    ),
                })),

            blockUserOptimistic: (userId) =>
                set((state) => ({
                    users: state.users.map((u) =>
                        u.id === userId ? { ...u, isBlocked: true } : u
                    ),
                })),

            unblockUserOptimistic: (userId) =>
                set((state) => ({
                    users: state.users.map((u) =>
                        u.id === userId ? { ...u, isBlocked: false } : u
                    ),
                    blockedUsers: state.blockedUsers.filter((u) => u.userId !== userId),
                })),

            addRole: (role) =>
                set((state) => ({
                    roles: [...state.roles, role].sort((a, b) => a.level - b.level),
                })),

            removeRole: (roleId) =>
                set((state) => ({
                    roles: state.roles.filter((r) => r.id !== roleId),
                })),
        }),
        { name: 'admin-store' }
    )
)
