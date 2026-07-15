// components/admin/blocked-users-table.tsx

"use client";

import { useState, useTransition } from "react";
import { useAdminStore } from "@/stores/admin-store";
import {
    unblockUserAction,
    listBlockedUsersAction,
} from "@/server/actions/user-admin-actions";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Unlock, Ban } from "lucide-react";
import { ROLE_HIERARCHY } from "@/lib/auth/rbac";

interface BlockedUsersTableProps {
    initialBlockedUsers: Array<{
        assignmentId: string;
        userId: string;
        email: string | null;
        name: string | null;
        role: string;
        roleLevel: number;
        blockedAt: Date | string | null;
        blockedUntil: Date | string | null;
        blockedReason: string | null;
        isPermanent: boolean;
    }>;
}

export function BlockedUsersTable({ initialBlockedUsers }: BlockedUsersTableProps) {
    const [isPending, startTransition] = useTransition();
    const [unblockDialogOpen, setUnblockDialogOpen] = useState<string | null>(null);
    const [unblockReason, setUnblockReason] = useState("");

    const { blockedUsers, setBlockedUsers, unblockUserOptimistic } = useAdminStore();

    useState(() => {
        setBlockedUsers(initialBlockedUsers);
    });

    const handleUnblock = async (userId: string) => {
        const formData = new FormData();
        formData.append("userId", userId);
        if (unblockReason) formData.append("reason", unblockReason);

        unblockUserOptimistic(userId);
        setUnblockDialogOpen(null);

        startTransition(async () => {
            const result = await unblockUserAction(formData);

            if (result.success) {
                toast.success(result.message || "Utilisateur débloqué");
                setUnblockReason("");
            } else {
                toast.error(result.error || "Erreur lors du déblocage");
                const refreshed = await listBlockedUsersAction();
                if (refreshed.success) {
                    setBlockedUsers(refreshed.data as any);
                }
            }
        });
    };

    const currentBlocked = blockedUsers.length > 0 ? blockedUsers : initialBlockedUsers;

    if (currentBlocked.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <Ban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun utilisateur bloqué</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Bloqué le</TableHead>
                        <TableHead>Fin du blocage</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentBlocked.map((user) => (
                        <TableRow key={user.assignmentId} className="hover:bg-slate-50/50">
                            <TableCell>
                                <div className="font-medium text-slate-900">{user.name || "N/A"}</div>
                                <div className="text-sm text-slate-500">{user.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-xs">
                                    {ROLE_HIERARCHY[user.roleLevel]?.label || user.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 text-sm">
                                {user.blockedAt
                                    ? format(new Date(user.blockedAt), "PPp", { locale: fr })
                                    : "—"}
                            </TableCell>
                            <TableCell>
                                {user.isPermanent ? (
                                    <Badge variant="destructive" className="text-xs">
                                        Permanent
                                    </Badge>
                                ) : user.blockedUntil ? (
                                    <span className="text-sm text-slate-600">
                                        {format(new Date(user.blockedUntil), "PPp", { locale: fr })}
                                    </span>
                                ) : (
                                    "—"
                                )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                                {user.blockedReason || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                                <Dialog
                                    open={unblockDialogOpen === user.userId}
                                    onOpenChange={(open) => {
                                        setUnblockDialogOpen(open ? user.userId : null);
                                        if (!open) setUnblockReason("");
                                    }}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                            disabled={isPending}
                                        >
                                            <Unlock className="w-4 h-4 mr-2" />
                                            Débloquer
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Débloquer {user.name || user.email}</DialogTitle>
                                            <DialogDescription>
                                                L&apos;utilisateur retrouvera immédiatement l&apos;accès à la plateforme.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="unblock-reason">Raison (optionnelle)</Label>
                                                <Textarea
                                                    id="unblock-reason"
                                                    value={unblockReason}
                                                    onChange={(e) => setUnblockReason(e.target.value)}
                                                    placeholder="Pourquoi débloquez-vous cet utilisateur ?"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                variant="default"
                                                onClick={() => handleUnblock(user.userId)}
                                                disabled={isPending}
                                            >
                                                <Unlock className="w-4 h-4 mr-2" />
                                                Confirmer le déblocage
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
