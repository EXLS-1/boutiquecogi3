import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          accounts: true,
          orders: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const total = users.length;
  const blocked = users.filter((u) => u.isBlocked).length;
  const deleted = users.filter((u) => u.isDeleted).length;
  const verified = users.filter((u) => u.emailVerified).length;
  const twoFactor = users.filter((u) => u.twoFactorEnabled).length;

  const formatDate = (d: Date | null | undefined) =>
    d
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(d))
      : "-";

  const formatRole = (role: Role) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-red-100 text-red-800",
      ADMIN: "bg-orange-100 text-orange-800",
      MANAGER: "bg-amber-100 text-amber-800",
      EDITOR: "bg-blue-100 text-blue-800",
      SUPERVISOR: "bg-purple-100 text-purple-800",
      USER: "bg-green-100 text-green-800",
      GUEST: "bg-gray-100 text-gray-600",
    };
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          colors[role] || "bg-gray-100 text-gray-700"
        }`}
      >
        {role}
      </span>
    );
  };

  const badge = (condition: boolean, label: string, colorOn: string, colorOff: string) =>
    condition ? (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorOn}`}>
        {label}
      </span>
    ) : (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorOff}`}>
        {label}
      </span>
    );

  return (
    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        Utilisateurs
      </h1>
      <p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "1.125rem" }}>
        Visualisation de tous les utilisateurs (existants et supprimés/bloqués)
      </p>

      {/* Stats cards */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Total utilisateurs", value: total, color: "#3b82f6" },
          { label: "Vérifiés", value: verified, color: "#10b981" },
          { label: "2FA activé", value: twoFactor, color: "#8b5cf6" },
          { label: "Bloqués", value: blocked, color: "#ef4444" },
          { label: "Supprimés", value: deleted, color: "#6b7280" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              flex: "1",
              minWidth: "160px",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>{stat.label}</p>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: stat.color, margin: "0.25rem 0 0" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {[
                  "ID",
                  "Nom",
                  "Email",
                  "Vérifié",
                  "Rôle",
                  "2FA",
                  "Bloqué",
                  "Supprimé",
                  "Mot de passe",
                  "Comptes",
                  "Commandes",
                  "Créé le",
                  "Mis à jour",
                  "Supprimé le",
                  "Version",
                  "Produits",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.75rem 0.75rem",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    style={{
                      padding: "3rem 1rem",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: u.isDeleted ? "#fef2f2" : u.isBlocked ? "#fffbeb" : "transparent",
                      opacity: u.isDeleted ? 0.7 : 1,
                    }}
                  >
                    <td
                      style={{
                        padding: "0.75rem",
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                        color: "#64748b",
                        maxWidth: "100px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={u.id}
                    >
                      {u.id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: "0.75rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {u.name || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                      {u.email || "-"}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {badge(u.emailVerified, "Oui", "bg-green-100 text-green-700", "bg-gray-100 text-gray-400")}
                    </td>
                    <td style={{ padding: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatRole(u.role)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {badge(u.twoFactorEnabled, "ON", "bg-purple-100 text-purple-700", "bg-gray-100 text-gray-400")}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {u.isBlocked ? (
                        <span title={u.blockReason || ""} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Oui{u.blockedUntil ? ` (jusq'au ${formatDate(u.blockedUntil)})` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">Non</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {badge(u.isDeleted, "Oui", "bg-red-100 text-red-700", "bg-gray-100 text-gray-400")}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {u.password ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            cursor: "help",
                          }}
                          title={u.password}
                        >
                          {u.password.slice(0, 12)}...
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem" }}>
                      {u._count.accounts}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem" }}>
                      {u._count.orders}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(u.createdAt)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(u.updatedAt)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(u.deletedAt)}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem" }}>
                      {u.version}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem" }}>
                      {u.productCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "0.75rem 1rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
            Affichage de {total} utilisateur{total > 1 ? "s" : ""} au total
            {deleted > 0 && ` (dont ${deleted} supprimé${deleted > 1 ? "s" : ""})`}
            {blocked > 0 && `, ${blocked} bloqué${blocked > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
}

