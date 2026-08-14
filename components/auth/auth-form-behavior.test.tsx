import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

const { push, refresh, signInEmail, signUpEmail, fetchMock } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn().mockResolvedValue({}),
  signUpEmail: vi.fn().mockResolvedValue({}),
  fetchMock: vi.fn(),
}));

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  signInEmail.mockClear();
  signUpEmail.mockClear();
  fetchMock.mockReset();

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/lib/auth/auth-client', () => ({
  authClient: {
    signIn: { email: signInEmail },
    signUp: { email: signUpEmail },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
}));

beforeEach(() => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
  global.fetch = fetchMock as typeof fetch;
});

describe('SignInForm behavior', () => {
  it('keeps the submit button disabled until valid email and password are entered, then resets after submission', async () => {
    render(<SignInForm />);

    const submitButton = screen.getByRole('button', { name: 'Se connecter' });
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mot de passe');

    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Motdepasse123!' } });

    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.getByRole('button', { name: 'En cours...' })).toBeDisabled());
    await waitFor(() => expect(emailInput).toHaveValue(''));
    await waitFor(() => expect(passwordInput).toHaveValue(''));
  });
});

describe('SignUpForm behavior', () => {
  it('keeps the submit button disabled until all required fields are valid, then shows loading state and clears fields', async () => {
    render(<SignUpForm />);

    const submitButton = screen.getByRole('button', { name: 'S\'inscrire' });
    const nameInput = screen.getByLabelText('Nom complet');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe');

    expect(submitButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Jean Dupont' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Motdepasse123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Motdepasse123!' } });

    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.getByRole('button', { name: 'En cours...' })).toBeDisabled());
    await waitFor(() => expect(nameInput).toHaveValue(''));
    await waitFor(() => expect(emailInput).toHaveValue(''));
    await waitFor(() => expect(passwordInput).toHaveValue(''));
    await waitFor(() => expect(confirmPasswordInput).toHaveValue(''));
  });
});
