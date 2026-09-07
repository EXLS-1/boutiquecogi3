import Link from 'next/link';

const links = [
  ['/admin', 'Portail Admin'],
  ['/admin/users', 'Utilisateurs'],
  ['/admin/users/accounts', 'Compte utilisateur'],
  ['/admin/users/rbac', 'Rbac utilisateur'],
  ['/admin/users/roles', 'Role utilisateur'],
  ['/admin/users/blocked', 'Blocage - Déblocage'],
  ['/admin/users/audit', 'Auditlog utilisateur'],
  ['/admin/users/settings', 'Paramètre utilisateur'],
] as const;

export function UserModuleNav() {
  return (
    <nav aria-label="Modules des utilisateurs" className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2">
          {label}
        </Link>
      ))}
    </nav>
  );
}