/**
 * Tests du hook `useMounted` (garde d'hydratation).
 *
 * Deux garanties sont vérifiées :
 *  - rendu serveur : le snapshot serveur renvoie `false` (le contenu client
 *    n'est donc pas rendu côté serveur → pas de mismatch d'hydratation) ;
 *  - rendu navigateur : le composant expose l'état « monté ».
 */

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useMounted } from './use-mounted';

function MountProbe() {
  const mounted = useMounted();
  return <span>{mounted ? 'client' : 'serveur'}</span>;
}

describe('useMounted', () => {
  it('renvoie false pendant le rendu serveur', () => {
    expect(renderToStaticMarkup(<MountProbe />)).toBe('<span>serveur</span>');
  });

  it('renvoie true une fois rendu dans le navigateur', () => {
    render(<MountProbe />);

    expect(screen.getByText('client')).toBeInTheDocument();
  });
});