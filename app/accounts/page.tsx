import { prisma } from "@/lib/prisma";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, role: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const total = accounts.length;
  const users = new Set(accounts.map(a => a.userId)).size;

  return (
    <div style={{maxWidth:"1200px",margin:"0 auto",padding:"2rem 1rem"}}>
      <h1 style={{fontSize:"1.875rem",fontWeight:"bold",marginBottom:"0.5rem"}}>Comptes authentification</h1>
      <p style={{color:"#64748b",marginBottom:"2rem",fontSize:"1.125rem"}}>Visualisation de tous les comptes dans la base de donnees</p>
      <div style={{display:"flex",gap:"1rem",marginBottom:"2rem",flexWrap:"wrap"}}>
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"1.25rem",flex:1,minWidth:"200px"}}>
          <p style={{fontSize:"0.875rem",color:"#64748b"}}>Total comptes</p>
          <p style={{fontSize:"1.5rem",fontWeight:"bold"}}>{total}</p>
        </div>
        <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"1.25rem",flex:1,minWidth:"200px"}}>
          <p style={{fontSize:"0.875rem",color:"#64748b"}}>Utilisateurs lies</p>
<p style={{fontSize:"1.5rem",fontWeight:"bold"}}>{users}</p>
        </div>
      <div style={{background:"white",border:"1px solid #e2e8f0",borderRadius:"0.75rem",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
              <th style={{textAlign:"left",padding:"0.75rem 1rem",fontSize:"0.75rem",fontWeight:"600",color:"#64748b",textTransform:"uppercase"}}>Provider</th>
              <th style={{textAlign:"left",padding:"0.75rem 1rem",fontSize:"0.75rem",fontWeight:"600",color:"#64748b",textTransform:"uppercase"}}>Type</th>
              <th style={{textAlign:"left",padding:"0.75rem 1rem",fontSize:"0.75rem",fontWeight:"600",color:"#64748b",textTransform:"uppercase"}}>Utilisateur</th>
              <th style={{textAlign:"left",padding:"0.75rem 1rem",fontSize:"0.75rem",fontWeight:"600",color:"#64748b",textTransform:"uppercase"}}>Provider Account ID</th>
              <th style={{textAlign:"left",padding:"0.75rem 1rem",fontSize:"0.75rem",fontWeight:"600",color:"#64748b",textTransform:"uppercase"}}>Cree le</th>
              <th style={{textAlign:"left",padding:"0.75rem 1rem",fontSize:"0.75rem",fontWeight:"600",color:"#64748b",textTransform:"uppercase"}}>Expire</th>
            </tr></thead>
            <tbody>{accounts.length === 0 ? (
                <tr><td colSpan={6} style={{padding:"3rem 1rem",textAlign:"center",color:"#94a3b8"}}>Aucun compte trouve.</td></tr>
              ) : (
                accounts.map(a => (
                  <tr key={a.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{padding:"0.75rem 1rem",fontWeight:"500",textTransform:"capitalize"}}>{a.provider}</td>
                    <td style={{padding:"0.75rem 1rem"}}><span style={{display:"inline-flex",padding:"0.125rem 0.625rem",borderRadius:"9999px",fontSize:"0.75rem",fontWeight:"500",background:a.type==="email"?"#dbeafe":a.type==="oauth"?"#f3e8ff":"#f1f5f9",color:a.type==="email"?"#1e40af":a.type==="oauth"?"#6b21a8":"#475569"}}>{a.type}</span></td>
                    <td style={{padding:"0.75rem 1rem"}}>{a.user ? (<div><p style={{fontWeight:"500",margin:0}}>{a.user.name||"-"}</p><p style={{fontSize:"0.875rem",color:"#64748b",margin:0}}>{a.user.email}</p></div>) : <span style={{color:"#94a3b8",fontStyle:"italic"}}>Supprime</span>}</td>
                    <td style={{padding:"0.75rem 1rem",fontFamily:"monospace",fontSize:"0.875rem",color:"#64748b"}}>{a.providerAccountId.length>12?a.providerAccountId.slice(0,8)+"..."+a.providerAccountId.slice(-4):a.providerAccountId}</td>
                    <td style={{padding:"0.75rem 1rem",fontSize:"0.875rem"}}>{new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(a.createdAt))}</td>
                    <td style={{padding:"0.75rem 1rem",fontSize:"0.875rem"}}>{a.expiresAt?new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(a.expiresAt*1000)):"-"}</td>
                  </tr>
                ))
              )}</tbody>
          </table>
        </div>
        <div style={{background:"#f8fafc",borderTop:"1px solid #e2e8f0",padding:"0.75rem 1rem"}}>
          <p style={{fontSize:"0.875rem",color:"#64748b",margin:0}}>Affichage de {total} compte{total > 1 ? "s" : ""} au total</p>
        </div>
    </div>
  );
}