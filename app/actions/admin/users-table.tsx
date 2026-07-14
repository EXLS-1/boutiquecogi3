// app/actions/admin/users-table.tsx
"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/server/actions/user-admin-actions";
import toast from "react-hot-toast";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
}

export function UsersTable({ initialUsers }: { initialUsers: User[] }) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId: string, newRole: string) => {
    startTransition(async () => {
      const result = await updateUserRole({
        userId,
        newRole: newRole as "user" | "admin" | "super_admin"
      });

      if (result.success) {
        toast.success(result.message || "Rôle mis à jour");
      } else {
        toast.error(result.error || "Une erreur est survenue");
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date d'inscription</TableHead>
            <TableHead>Rôle actuel</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialUsers.map((user) => (
            <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="font-medium text-slate-900">
                {user.name || "N/A"}
              </TableCell>
              <TableCell className="text-slate-600">{user.email}</TableCell>
              <TableCell className="text-slate-500 text-sm">
                {format(user.createdAt, "PPP", { locale: fr })}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    user.role === "super_admin" ? "border-rose-200 bg-rose-50 text-rose-700" :
                      user.role === "admin" ? "border-cyan-200 bg-cyan-50 text-cyan-700" :
                        "border-slate-200 bg-slate-50 text-slate-600"
                  }
                >
                  {user.role.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Select
                  disabled={isPending}
                  defaultValue={user.role}
                  onValueChange={(value) => handleRoleChange(user.id, value)}
                >
                  <SelectTrigger className="w-35 ml-auto h-8 text-xs">
                    <SelectValue placeholder="Changer rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
