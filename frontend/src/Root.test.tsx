import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Root from './Root';

// The signed-in app is lazy-loaded, so its screens are awaited; the first import can take a few seconds.
const LAZY = { timeout: 15000 };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Root />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('top-level routing: marketing site and app', { timeout: 20000 }, () => {
  it('shows the marketing home page at /', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: /from campus learning to career readiness/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/login');
  });

  it('sends /login to Campus Workspace sign-in', async () => {
    renderAt('/login');

    expect(await screen.findByRole('link', { name: /owner console/i }, LAZY)).toHaveAttribute('href', '/owner/login');
  });

  it('sends /owner/login to the Owner Console sign-in', async () => {
    renderAt('/owner/login');

    expect(await screen.findByRole('button', { name: /sign in to owner console/i }, LAZY)).toBeInTheDocument();
  });

  it('keeps workspace deep links in the app', async () => {
    renderAt('/app/marks');

    expect(await screen.findByRole('button', { name: /sign in/i }, LAZY)).toBeInTheDocument();
  });

  it('loads other marketing pages on demand', async () => {
    renderAt('/about');

    expect(await screen.findByRole('heading', { level: 1 }, LAZY)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('shows the marketing 404 for unknown public paths', () => {
    renderAt('/no-such-page');

    expect(screen.getByRole('heading', { level: 1, name: /couldn't find that page/i })).toBeInTheDocument();
  });
});
