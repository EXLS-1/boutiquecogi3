// components/admin/roles-table.tsx

"use client";

import { useState, useTransition } from "react";
import { useAdminStore } from "@/stores/admin-store";
import {
    createRoleAction,
    deleteRoleAction,
    listRolesAction,
} from "@/server/actions/role-actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_HIERARCHY, PERMISSIONS, PERMISSION_META } from "@/lib/auth/rbac";
import { Trash2, Plus, Shield } from "lucide-react";

interface RolesTableProps {
    initialRoles: Array<{
        id: string;
        name: string;
        level: number;
        description: string | null;
        isActive: boolean;
        userCount: number;
        permissions: { code: string; name: string }[];
    }>;
}

const ROLE_COLORS: Record<number, string> = {
    1: "border-rose-200 bg-rose-50 text-rose-700",
    2: "border-orange-200 bg-orange-50 text-orange-700",
    3: "border-amber-200 bg-amber-50 text-amber-700",
    4: "border-emerald-200 bg-emerald-50 text-emerald-700",
    5: "border-blue-200 bg-blue-50 text-blue-700",
    6: "border-slate-200 bg-slate-50 text-slate-600",
    7: "border-slate-200 bg-slate-50 text-slate-400",
};

export function RolesTable({ initialRoles }: RolesTableProps) {
    const [isPending, startTransition] = useTransition();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

    // Form state
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleLevel, setNewRoleLevel] = useState("");
    const [newRoleDescription, setNewRoleDescription] = useState("");
    const [newRoleActive, setNewRoleActive] = useState(true);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const { roles, setRoles, addRole, removeRole } = useAdminStore();

    useState(() => {
        setRoles(initialRoles);
    });

    const allPermissions = Object.values(PERMISSIONS).map((code) => ({
        code,
        ...PERMISSION_META[code],
    }));

    const handleCreateRole = () => {
        if (!newRoleName.trim() || !newRoleLevel) {
            toast.error("Nom et niveau sont obligatoires");
            return;
        }

        const formData = new FormData();
        formData.append("name", newRoleName.toUpperCase().replace(/\s+/g, "_"));
        formData.append("level", newRoleLevel);
        formData.append("description", newRoleDescription);
        formData.append("isActive", newRoleActive ? "true" : "false");
        formData.append("defaultPermissionCodes", JSON.stringify(selectedPermissions));

        startTransition(async () => {
            const result = await createRoleAction(formData);

            if (result.success) {
                toast.success(result.message || "Rôle créé");
                addRole(result.data as any);
                setCreateDialogOpen(false);
                // Reset form
                setNewRoleName("");
                setNewRoleLevel("");
                setNewRoleDescription("");
                setNewRoleActive(true);
                setSelectedPermissions([]);
            } else {
                toast.error(result.error || "Erreur lors de la création");
            }
        });
    };

    const handleDeleteRole = (roleId: string) => {
        startTransition(async () => {
            const result = await deleteRoleAction(roleId);

            if (result.success) {
                toast.success(result.message || "Rôle supprimé");
                removeRole(roleId);
                setDeleteDialogOpen(null);
            } else {
                toast.error(result.error || "Erreur lors de la suppression");
            }
        });
    };

    const currentRoles = roles.length > 0 ? roles : initialRoles;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Gestion des rôles</h2>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Nouveau rôle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Créer un nouveau rôle</DialogTitle>
                            <DialogDescription>
                                Définissez le niveau, les permissions et les restrictions du rôle.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom * (MAJUSCULES_UNDERSCORES)</Label>
                                    <Input
                                        id="name"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                                        placeholder="EX: MODERATEUR"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="level">Niveau * (2-6)</Label>
                                    <Select value={newRoleLevel} onValueChange={setNewRoleLevel}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un niveau" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[2, 3, 4, 5, 6].map((level) => (
                                                <SelectItem key={level} value={String(level)}>
                                                    {level} — {ROLE_HIERARCHY[level]?.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={newRoleDescription}
                                    onChange={(e) => setNewRoleDescription(e.target.value)}
                                    placeholder="Description du rôle..."
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active"
                                    checked={newRoleActive}
                                    onCheckedChange={setNewRoleActive}
                                />
                                <Label htmlFor="active">Rôle actif</Label>
                            </div>
                            <div className="space-y-2">
                                <Label>Permissions</Label>
                                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                                    {Object.entries(
                                        allPermissions.reduce((acc, perm) => {
                                            const cat = perm.category;
                                            if (!acc[cat]) acc[cat] = [];
                                            acc[cat].push(perm);
                                            return acc;
                                        }, {} as Record<string, typeof allPermissions>)
                                    ).map(([category, perms]) => (
                                        <div key={category}>
                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                {category}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map((perm) => (
                                                    <div key={perm.code} className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={perm.code}
                                                            checked={selectedPermissions.includes(perm.code)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedPermissions((prev) => [...prev, perm.code]);
                                                                } else {
                                                                    setSelectedPermissions((prev) =>
                                                                        prev.filter((p) => p !== perm.code)
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                        <Label htmlFor={perm.code} className="text-xs leading-tight cursor-pointer">
                                                            <span className="font-medium">{perm.code}</span>
                                                            <span className="text-slate-500 block">{perm.description}</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={handleCreateRole}
                                disabled={isPending || !newRoleName.trim() || !newRoleLevel}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Créer le rôle
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Niveau</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Utilisateurs</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentRoles.map((role) => (
                            <TableRow key={role.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={ROLE_COLORS[role.level] || ROLE_COLORS[7]}
                                    >
                                        {role.level}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-slate-900">
                                    {ROLE_HIERARCHY[role.level]?.label || role.name}
                                </TableCell>
                                <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                                    {role.description || "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                        {role.userCount} utilisateur{role.userCount > 1 ? "s" : ""}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {role.isActive ? (
                                        <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Actif
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-xs">
                                            Inactif
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {role.level > 1 && role.level < 7 && (
                                        <Dialog
                                            open={deleteDialogOpen === role.id}
                                            onOpenChange={(open) => setDeleteDialogOpen(open ? role.id : null)}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                    disabled={isPending || role.userCount > 0}
                                                    title={role.userCount > 0 ? "Impossible: utilisateurs assignés" : "Supprimer"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Supprimer le rôle {role.name} ?</DialogTitle>
                                                    <DialogDescription>
                                                        Cette action est irréversible. Le rôle ne pourra pas être récupéré.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleDeleteRole(role.id)}
                                                        disabled={isPending}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Supprimer définitivement
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
