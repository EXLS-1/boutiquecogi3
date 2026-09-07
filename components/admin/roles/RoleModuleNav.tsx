import Link from 'next/link';

const links = [
  ['/admin', 'Portail Admin'],
  ['/admin/roles', 'Configuration'],
  ['/admin/role_permissions', 'Permissions'],
  ['/admin/role_restrictions', 'Restrictions'],
  ['/admin/role_audit', 'Assignments & audit'],
] as const;

export function RoleModuleNav() {
  return (
    <nav aria-label="Modules des rôles" className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2">
          {label}
        </Link>
      ))}
    </nav>
  );
}