/**
 * Tests de la navigation de module partagée (`AdminModuleNav`).
 *
 * Le composant est un Server Component : on vérifie le HTML produit
 * (liens réels + onglet actif marqué `aria-current="page"`) ainsi que
 * l'existence physique des routes déclarées dans `ADMIN_NAV`, afin
 * qu'aucun onglet du portail ne pointe vers une page inexistante.
 */

import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { AdminModuleNav, ADMIN_NAV } from './admin-module-nav';

describe('AdminModuleNav', () => {
  it('renders every declared tab as a real link', () => {
    render(
      <AdminModuleNav
        ariaLabel="Modules d'administration"
        links={ADMIN_NAV}
        activeHref="/admin"
      />,
    );

    expect(
      screen.getByRole('navigation', { name: "Modules d'administration" }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('link')).toHaveLength(ADMIN_NAV.length);

    for (const link of ADMIN_NAV) {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute(
        'href',
        link.href,
      );
    }
  });

  it('exposes only the current tab as the active page', () => {
    render(
      <AdminModuleNav
        ariaLabel="Modules d'administration"
        links={ADMIN_NAV}
        activeHref="/admin/roles"
      />,
    );

    expect(screen.getByRole('link', { name: 'Rôles' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Portail' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('keeps every ADMIN_NAV target in sync with an existing app route', () => {
    for (const link of ADMIN_NAV) {
      const pagePath = path.join(
        process.cwd(),
        'app',
        ...link.href.split('/').filter(Boolean),
        'page.tsx',
      );

      expect(fs.existsSync(pagePath), `${link.href} -> ${pagePath}`).toBe(true);
    }
  });
});
