import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('App routing (signed out)', () => {
  it('opens the reset page from the email link', () => {
    renderAt('/reset-password?token=abc&email=staff%40demo.com');

    expect(screen.getByRole('heading', { name: 'Set a new password' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveValue('staff@demo.com');
  });

  it('opens the registration page', () => {
    renderAt('/register');

    expect(screen.getByRole('heading', { name: 'Student registration' })).toBeInTheDocument();
  });

  it('shows sign-in for workspace pages until the user signs in', () => {
    renderAt('/app/marks');

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
