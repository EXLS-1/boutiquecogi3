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
  it('clears the email and password fields whenever the form mounts again', () => {
    const { unmount } = render(<SignInForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mot de passe');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Motdepasse123!' } });

    expect(emailInput).toHaveValue('user@example.com');
    expect(passwordInput).toHaveValue('Motdepasse123!');

    unmount();
    render(<SignInForm />);

    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('');
  });

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

  it('clears email and password again when the page is shown again after a refresh', async () => {
    render(<SignInForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mot de passe');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Motdepasse123!' } });

    expect(emailInput).toHaveValue('user@example.com');
    expect(passwordInput).toHaveValue('Motdepasse123!');

    fireEvent(window, new Event('pageshow'));

    await waitFor(() => {
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
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

  it('clears all fields again when the sign-up page is shown after a refresh', async () => {
    render(<SignUpForm />);

    const nameInput = screen.getByLabelText('Nom complet');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe');

    fireEvent.change(nameInput, { target: { value: 'Jean Dupont' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Motdepasse123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Motdepasse123!' } });

    expect(nameInput).toHaveValue('Jean Dupont');
    expect(emailInput).toHaveValue('user@example.com');
    expect(passwordInput).toHaveValue('Motdepasse123!');
    expect(confirmPasswordInput).toHaveValue('Motdepasse123!');

    fireEvent(window, new Event('pageshow'));

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });
  });
});
