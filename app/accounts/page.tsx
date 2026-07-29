import Link from "next/link";
import { prisma } from "@/lib/prisma";

const formatDate = (d: Date | number | null | undefined) => {
  if (d == null) return "-";
  const date = typeof d === "number" ? new Date(d * 1000) : new Date(d);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const badge = (condition: boolean, labelOn: string, labelOff: string, colorOn: string, colorOff: string) =>
  condition ? (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorOn}`}>
      {labelOn}
    </span>
  ) : (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorOff}`}>
      {labelOff}
    </span>
  );

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, role: true, isDeleted: true, isBlocked: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const total = accounts.length;
  const users = new Set(accounts.map((a) => a.userId)).size;
  const providers = [...new Set(accounts.map((a) => a.provider))];
  const types = [...new Set(accounts.map((a) => a.type))];
  const withPassword = accounts.filter((a) => a.password).length;
  const withRefresh = accounts.filter((a) => a.refreshToken).length;
  const withAccess = accounts.filter((a) => a.accessToken).length;

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
        Comptes authentification
      </h1>
<p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "1.125rem" }}>
        Visualisation de tous les comptes dans la base de donnees
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/user"
          className="bg-cyan-400 hover:bg-rose-500 text-white shadow-sm transition-all duration-300 active:scale-95 inline-block px-4 py-2 rounded-lg font-medium"
        >
          User
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {[
          { label: "Total comptes", value: total, color: "#3b82f6" },
          { label: "Utilisateurs liés", value: users, color: "#10b981" },
          { label: "Fournisseurs", value: providers.length, color: "#8b5cf6" },
          { label: "Avec mot de passe", value: withPassword, color: "#f59e0b" },
          { label: "Avec refresh token", value: withRefresh, color: "#ef4444" },
          { label: "Avec access token", value: withAccess, color: "#6b7280" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              flex: "1",
              minWidth: "140px",
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1600px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {[
                  "ID",
                  "Provider",
                  "Type",
                  "Provider Account ID",
                  "Utilisateur",
                  "Mot de passe",
                  "Refresh Token",
                  "Access Token",
                  "Token Type",
                  "Scope",
                  "ID Token",
                  "Session State",
                  "Créé le",
                  "Mis à jour",
                  "Expire",
                  "Refresh Expire",
                  "Access Expire",
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
              {accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={17}
                    style={{ padding: "3rem 1rem", textAlign: "center", color: "#94a3b8" }}
                  >
                    Aucun compte trouvé.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: a.user?.isDeleted
                        ? "#fef2f2"
                        : a.user?.isBlocked
                        ? "#fffbeb"
                        : "transparent",
                      opacity: a.user?.isDeleted ? 0.7 : 1,
                    }}
                  >
                    <td
                      style={{
                        padding: "0.75rem",
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                        color: "#64748b",
                        maxWidth: "80px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={a.id}
                    >
                      {a.id.slice(0, 8)}...
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        fontWeight: 500,
                        textTransform: "capitalize",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.provider}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "0.125rem 0.625rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          background:
                            a.type === "email"
                              ? "#dbeafe"
                              : a.type === "oauth"
                              ? "#f3e8ff"
                              : "#f1f5f9",
                          color:
                            a.type === "email"
                              ? "#1e40af"
                              : a.type === "oauth"
                              ? "#6b21a8"
                              : "#475569",
                        }}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                        color: "#64748b",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={a.providerAccountId}
                    >
                      {a.providerAccountId.length > 12
                        ? a.providerAccountId.slice(0, 8) +
                          "..." +
                          a.providerAccountId.slice(-4)
                        : a.providerAccountId}
                    </td>
                    <td style={{ padding: "0.75rem", whiteSpace: "nowrap" }}>
                      {a.user ? (
                        <div>
                          <p style={{ fontWeight: 500, margin: 0 }}>
                            {a.user.name || "-"}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                            {a.user.email}
                          </p>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                          Supprimé
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {a.password ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            cursor: "help",
                          }}
                          title={a.password}
                        >
                          {a.password.slice(0, 12)}...
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {a.refreshToken ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                            cursor: "help",
                            maxWidth: "100px",
                            display: "inline-block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={a.refreshToken}
                        >
                          {a.refreshToken.slice(0, 16)}...
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {a.accessToken ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                            cursor: "help",
                            maxWidth: "100px",
                            display: "inline-block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={a.accessToken}
                        >
                          {a.accessToken.slice(0, 16)}...
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem" }}>
                      {a.tokenType || (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem" }}>
                      {a.scope || (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {a.idToken ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                            cursor: "help",
                            maxWidth: "80px",
                            display: "inline-block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={a.idToken}
                        >
                          {a.idToken.slice(0, 12)}...
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem" }}>
                      {a.sessionState || (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatDate(a.createdAt)}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatDate(a.updatedAt)}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {a.expiresAt ? formatDate(a.expiresAt * 1000) : "-"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatDate(a.refreshTokenExpiresAt)}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {formatDate(a.accessTokenExpiresAt)}
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
            Affichage de {total} compte{total > 1 ? "s" : ""} au total —{" "}
            {providers.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
