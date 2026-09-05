import Link from 'next/link';

const links = [
  ['/admin/roles', 'Configuration'],
  ['/admin/role_permissions', 'Permissions'],
  ['/admin/role_restrictions', 'Restrictions'],
  ['/admin/role_audit', 'Assignments & audit'],
] as const;

export function RoleModuleNav() {
  return (
    <nav aria-label="Modules des rôles" className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-950">
          {label}
        </Link>
      ))}
    </nav>
  );
}