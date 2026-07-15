// components/admin/users-table.tsx

"use client";

import { useState, useTransition } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { assignRoleAction, blockUserAction } from "@/server/actions/user-admin-actions";
import { listUsersAction } from "@/server/actions/user-admin-actions";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield, Ban, UserCheck, Crown, UserCog, User, Users } from "lucide-react";
import { ROLE_HIERARCHY } from "@/lib/auth/rbac";

interface UsersTableProps {
    initialUsers: Array<{
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        roleLevel: number;
        isBlocked: boolean;
        createdAt: Date | string;
    }>;
    initialRoles: Array<{
        id: string;
        name: string;
        level: number;
    }>;
}

const ROLE_ICONS: Record<number, React.ReactNode> = {
    1: <Crown className="w-4 h-4 text-rose-500" />,
    2: <Shield className="w-4 h-4 text-orange-500" />,
    3: <UserCog className="w-4 h-4 text-amber-500" />,
    4: <UserCheck className="w-4 h-4 text-emerald-500" />,
    5: <User className="w-4 h-4 text-blue-500" />,
    6: <Users className="w-4 h-4 text-slate-500" />,
    7: <Users className="w-4 h-4 text-slate-400" />,
};

const ROLE_COLORS: Record<number, string> = {
    1: "border-rose-200 bg-rose-50 text-rose-700",
    2: "border-orange-200 bg-orange-50 text-orange-700",
    3: "border-amber-200 bg-amber-50 text-amber-700",
    4: "border-emerald-200 bg-emerald-50 text-emerald-700",
    5: "border-blue-200 bg-blue-50 text-blue-700",
    6: "border-slate-200 bg-slate-50 text-slate-600",
    7: "border-slate-200 bg-slate-50 text-slate-400",
};

export function UsersTable({ initialUsers, initialRoles }: UsersTableProps) {
    const [isPending, startTransition] = useTransition();
    const [blockDialogOpen, setBlockDialogOpen] = useState<string | null>(null);
    const [blockReason, setBlockReason] = useState("");
    const [blockPermanent, setBlockPermanent] = useState(false);
    const [blockUntil, setBlockUntil] = useState("");

    const { users, setUsers, updateUserRole, blockUserOptimistic } = useAdminStore();

    // Hydrate store with initial data
    useState(() => {
        setUsers(initialUsers);
    });

    const handleRoleChange = (userId: string, newRoleId: string) => {
        const role = initialRoles.find((r) => r.id === newRoleId);
        if (!role) return;

        // Optimistic update
        updateUserRole(userId, role.name, role.level);

        startTransition(async () => {
            const result = await assignRoleAction(userId, newRoleId);

            if (result.success) {
                toast.success(result.message || "Rôle mis à jour");
            } else {
                toast.error(result.error || "Une erreur est survenue");
                // Rollback: refetch
                const refreshed = await listUsersAction();
                if (refreshed.success) {
                    setUsers(refreshed.data as any);
                }
            }
        });
    };

    const handleBlock = async (userId: string) => {
        if (!blockReason.trim()) {
            toast.error("La raison est obligatoire");
            return;
        }

        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("reason", blockReason);
        if (blockUntil && !blockPermanent) formData.append("blockedUntil", blockUntil);
        if (blockPermanent) formData.append("permanent", "true");

        blockUserOptimistic(userId);
        setBlockDialogOpen(null);

        startTransition(async () => {
            const result = await blockUserAction(formData);

            if (result.success) {
                toast.success(result.message || "Utilisateur bloqué");
                setBlockReason("");
                setBlockPermanent(false);
                setBlockUntil("");
            } else {
                toast.error(result.error || "Erreur lors du blocage");
                const refreshed = await listUsersAction();
                if (refreshed.success) {
                    setUsers(refreshed.data as any);
                }
            }
        });
    };

    const currentUsers = users.length > 0 ? users : initialUsers;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date d&apos;inscription</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentUsers.map((user) => (
                        <TableRow
                            key={user.id}
                            className={`hover:bg-slate-50/50 transition-colors ${user.isBlocked ? "opacity-60 bg-red-50/30" : ""
                                }`}
                        >
                            <TableCell className="py-2">
                                {ROLE_ICONS[user.roleLevel] || ROLE_ICONS[7]}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                                {user.name || "N/A"}
                            </TableCell>
                            <TableCell className="text-slate-600">{user.email}</TableCell>
                            <TableCell className="text-slate-500 text-sm">
                                {format(new Date(user.createdAt), "PPP", { locale: fr })}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={ROLE_COLORS[user.roleLevel] || ROLE_COLORS[7]}
                                >
                                    {ROLE_HIERARCHY[user.roleLevel]?.label || user.role}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {user.isBlocked ? (
                                    <Badge variant="destructive" className="text-xs">
                                        <Ban className="w-3 h-3 mr-1" />
                                        Bloqué
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        Actif
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Select
                                        disabled={isPending || user.isBlocked}
                                        value={initialRoles.find((r) => r.name === user.role)?.id || ""}
                                        onValueChange={(value) => handleRoleChange(user.id, value)}
                                    >
                                        <SelectTrigger className="w-36 h-8 text-xs">
                                            <SelectValue placeholder="Changer rôle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialRoles
                                                .filter((r) => r.level > 1) // Ne pas afficher SUPER_ADMIN
                                                .map((role) => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {ROLE_HIERARCHY[role.level]?.label || role.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>

                                    {!user.isBlocked && (
                                        <Dialog
                                            open={blockDialogOpen === user.id}
                                            onOpenChange={(open) => {
                                                setBlockDialogOpen(open ? user.id : null);
                                                if (!open) {
                                                    setBlockReason("");
                                                    setBlockPermanent(false);
                                                    setBlockUntil("");
                                                }
                                            }}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                    disabled={isPending}
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Bloquer {user.name || user.email}</DialogTitle>
                                                    <DialogDescription>
                                                        Cet utilisateur ne pourra plus accéder à la plateforme.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="reason">Raison *</Label>
                                                        <Textarea
                                                            id="reason"
                                                            value={blockReason}
                                                            onChange={(e) => setBlockReason(e.target.value)}
                                                            placeholder="Pourquoi bloquez-vous cet utilisateur ?"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Switch
                                                            id="permanent"
                                                            checked={blockPermanent}
                                                            onCheckedChange={setBlockPermanent}
                                                        />
                                                        <Label htmlFor="permanent">Blocage permanent</Label>
                                                    </div>
                                                    {!blockPermanent && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="until">Bloqué jusqu&apos;au</Label>
                                                            <Input
                                                                id="until"
                                                                type="datetime-local"
                                                                value={blockUntil}
                                                                onChange={(e) => setBlockUntil(e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleBlock(user.id)}
                                                        disabled={!blockReason.trim() || isPending}
                                                    >
                                                        <Ban className="w-4 h-4 mr-2" />
                                                        Bloquer
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
