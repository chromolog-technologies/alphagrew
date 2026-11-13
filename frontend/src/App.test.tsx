import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <App />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const emptyDataset = {
  brand: { name: 'Chromolog', shortName: 'CL', tagline: 'Campus' },
  users: [],
  designations: [],
  departments: [],
  masters: [],
  students: [],
  companies: [],
  announcements: [],
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

  it('renders dedicated Campus Workspace login with Owner Console footer link and no owner operator form', () => {
    renderAt('/login');

    expect(screen.getByRole('link', { name: /owner console/i })).toHaveAttribute('href', '/owner/login');
    expect(screen.queryByRole('button', { name: /sign in to owner console/i })).not.toBeInTheDocument();
  });

  it('renders dedicated Owner Console login for a single owner role without student self-registration', () => {
    renderAt('/owner/login');

    expect(screen.getByRole('button', { name: /sign in to owner console/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /platform owner/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /platform mgr|support mgr|auditor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
  });

  it('shows Campus Workspace switch link when /owner/login rejects a campus user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(403, {
          message: 'Institution accounts must sign in through the Campus Workspace portal.',
          code: 'use_campus_login',
        }),
      ),
    );

    renderAt('/owner/login');

    fireEvent.change(screen.getByLabelText(/operator email/i), { target: { value: 'student@demo.com' } });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), { target: { value: 'demo123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to owner console/i }));

    expect(await screen.findByText(/institution accounts must sign in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open campus workspace sign-in/i })).toHaveAttribute('href', '/login');
  });

  it('shows Owner Console switch link when /login rejects a platform user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(403, {
          message: 'Platform operators must sign in through the Owner Console.',
          code: 'use_owner_login',
        }),
      ),
    );

    const { container } = renderAt('/login');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'owner@demo.com' } });
    const passwordInput = container.querySelector('input[type="password"]');
    expect(passwordInput).not.toBeNull();
    fireEvent.change(passwordInput!, { target: { value: 'demo123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/platform operators must sign in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to owner console sign-in/i })).toHaveAttribute('href', '/owner/login');
  });

  it('completes Owner Console 2FA MFA flow and enters OwnerWorkspace', async () => {
    const ownerUser = {
      id: 1,
      name: 'Platform Owner',
      email: 'owner@demo.com',
      role: 'super_admin',
      permissions: [],
      ownerPermissions: ['owner.overview.view'],
      platformRole: 'super_admin',
      mfaEnabled: true,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/owner/auth/login')) {
        return jsonResponse(200, { mfaRequired: true, challengeToken: 'mfa-chal-99' });
      }
      if (url.endsWith('/auth/mfa/verify')) {
        return jsonResponse(200, { token: '1|owner-tok', user: ownerUser, data: emptyDataset });
      }
      if (url.endsWith('/campus/bootstrap')) {
        return jsonResponse(200, { user: ownerUser, data: emptyDataset });
      }
      if (url.includes('/owner/overview')) {
        return jsonResponse(200, {
          counts: { institutions: 1, activeInstitutions: 1, suspendedInstitutions: 0, users: 1, students: 0, activeSessions: 1 },
          recentAudits: [],
          recentLogins: [],
        });
      }
      if (url.includes('/owner/dashboard/summary')) {
        return jsonResponse(200, { data: null });
      }
      if (url.includes('/owner/dashboard/trends') || url.includes('/owner/dashboard/alerts') || url.includes('/owner/dashboard/activity')) {
        return jsonResponse(200, { data: [] });
      }
      return jsonResponse(200, {});
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/owner/login');

    fireEvent.change(screen.getByLabelText(/operator email/i), { target: { value: 'owner@demo.com' } });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), { target: { value: 'demo123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to owner console/i }));

    const mfaInput = await screen.findByLabelText(/verification code/i);
    fireEvent.change(mfaInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verify & sign in/i }));

    expect(await screen.findByLabelText(/owner console navigation/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verify & sign in/i })).not.toBeInTheDocument();
  });
});

describe('App routing (signed in role isolation)', () => {
  it('redirects signed-in super_admin away from /app/dashboard to Owner Console', async () => {
    const ownerUser = {
      id: 1,
      name: 'Platform Owner',
      email: 'owner@demo.com',
      role: 'super_admin',
      permissions: [],
      ownerPermissions: ['owner.overview.view'],
      platformRole: 'super_admin',
    };
    localStorage.setItem('chromolog-campus-auth', JSON.stringify({ token: '1|owner-tok', user: ownerUser }));

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.endsWith('/campus/bootstrap')) {
          return jsonResponse(200, { user: ownerUser, data: emptyDataset });
        }
        if (url.includes('/owner/dashboard/summary')) {
          return jsonResponse(200, { data: null });
        }
        if (url.includes('/owner/dashboard/trends') || url.includes('/owner/dashboard/alerts') || url.includes('/owner/dashboard/activity')) {
          return jsonResponse(200, { data: [] });
        }
        return jsonResponse(200, {
          counts: { institutions: 0, activeInstitutions: 0, suspendedInstitutions: 0, users: 0, students: 0, activeSessions: 0 },
          recentAudits: [],
          recentLogins: [],
        });
      }),
    );

    renderAt('/app/dashboard');

    expect(await screen.findByLabelText(/owner console navigation/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Institutions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Global settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /roles & permissions/i })).not.toBeInTheDocument();
  });

  it('redirects signed-in campus student away from /owner/overview to Campus Workspace', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(min-width: 1024px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const studentUser = {
      id: 5,
      name: 'Campus Student',
      email: 'student@demo.com',
      role: 'student',
      permissions: ['campus:dashboard:view'],
      emailVerified: true,
    };
    localStorage.setItem('chromolog-campus-auth', JSON.stringify({ token: '1|stud-tok', user: studentUser }));

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.endsWith('/campus/bootstrap')) {
          return jsonResponse(200, { user: studentUser, data: emptyDataset });
        }
        if (url.includes('/notifications')) {
          return jsonResponse(200, { data: [], meta: { unreadCount: 0, total: 0 } });
        }
        if (url.endsWith('/dashboards/home')) {
          return jsonResponse(200, {
            data: {
              id: 1,
              key: null,
              name: 'Home',
              description: null,
              templateKey: null,
              isTemplate: false,
              isOwner: true,
              isHome: true,
              owner: null,
              sharing: { roles: [], designationIds: [], audienceDefault: false },
              widgets: [],
              updatedAt: null,
            },
          });
        }
        if (url.endsWith('/dashboards')) {
          return jsonResponse(200, { data: [], templates: [], defaultTemplate: 'student' });
        }
        return jsonResponse(200, { data: [] });
      }),
    );

    renderAt('/owner/overview');

    const nameMatches = await screen.findAllByText('Campus Student', {}, { timeout: 10000 });
    expect(nameMatches.length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/owner console navigation/i)).not.toBeInTheDocument();
  }, 15000);
});

describe('Owner Console Release 2 (SaaS commercial & AI credits)', () => {
  const ownerUser = {
    id: 1,
    name: 'Platform Owner',
    email: 'owner@demo.com',
    role: 'super_admin',
    permissions: [],
    ownerPermissions: ['owner.*'],
    platformRole: 'super_admin',
  };

  async function stubOwnerR2Fetch() {
    const { queryClient } = await import('./lib/queryClient');
    queryClient.clear();
    localStorage.setItem('chromolog-campus-auth', JSON.stringify({ token: '1|owner-tok', user: ownerUser }));
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(min-width: 1024px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.endsWith('/campus/bootstrap')) {
          return jsonResponse(200, { user: ownerUser, data: emptyDataset });
        }
        if (url.includes('/owner/dashboard/summary')) {
          return jsonResponse(200, {
            data: {
              institutions: { total: 2, active: 1, trial: 1, suspended: 0, newInPeriod: 1, pendingVerification: 0, byStatus: { prospect: 0, trial: 1, active: 1, suspended: 0, expired: 0, closed: 0 } },
              users: { total: 10, activeInPeriod: 8, newInPeriod: 2, activeSessions: 2 },
              commercial: {
                currency: 'INR',
                mrr: 9999,
                arr: 119988,
                invoiced: 11798.82,
                collectedRevenue: 11798.82,
                outstandingBalance: 0,
                subscriptions: { active: 1, trial: 1, pastDue: 0, total: 2, trialConversionRate: 50, churnRate: 0 },
                planDistribution: [{ planId: 1, planCode: 'GROWTH', planName: 'Growth', subscriptions: 1, mrr: 9999 }],
              },
              ai: { calls: 12, failures: 0, tokens: 3000, estimatedCostUsd: 0.02, creditsAllocated: 2500, creditsConsumed: 50, creditsRemaining: 2450, creditsUsedInPeriod: 50, note: 'Test ledger' },
              system: { database: { ok: true }, queue: { driver: 'sync', failedJobs: 0 }, storage: { ok: true }, maintenanceMode: false, environment: 'testing', version: 'test' },
              generatedAt: '2026-11-11T10:00:00Z',
            },
          });
        }
        if (url.includes('/owner/dashboard/trends')) {
          return jsonResponse(200, { data: [{ month: '2026-11', newInstitutions: 1, totalInstitutions: 2, newUsers: 2, revenueCollected: 11798.82, aiCalls: 12, aiCostUsd: 0.02, aiCreditsUsed: 50 }] });
        }
        if (url.includes('/owner/dashboard/alerts') || url.includes('/owner/dashboard/activity')) {
          return jsonResponse(200, { data: [] });
        }
        if (url.includes('/owner/plans')) {
          return jsonResponse(200, { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } });
        }
        if (url.includes('/owner/subscriptions')) {
          return jsonResponse(200, { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } });
        }
        if (url.includes('/owner/revenue/summary')) {
          return jsonResponse(200, {
            data: {
              currency: 'INR',
              period: { from: '2026-10-12', to: '2026-11-11' },
              mrr: 9999,
              arr: 119988,
              invoiced: 11798.82,
              collected: 11798.82,
              refunded: 0,
              outstanding: 0,
              subscriptions: { active: 1, trial: 1, pastDue: 0, total: 2, trialConversionRate: 50, churnRate: 0 },
              byPlan: [],
              byInstitution: [],
            },
          });
        }
        if (url.includes('/owner/invoices') || url.includes('/owner/payments') || url.includes('/owner/refunds') || url.includes('/owner/ai/usage')) {
          return jsonResponse(200, { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 }, summary: { calls: 0, failures: 0, tokens: 0, estimatedCostUsd: 0, creditsCharged: 0 } });
        }
        if (url.includes('/owner/tax-profiles') || url.includes('/owner/coupons')) {
          return jsonResponse(200, { data: [] });
        }
        if (url.includes('/owner/ai/credits')) {
          return jsonResponse(200, { data: [], summary: { allocated: 2500, consumed: 50, remaining: 2450 } });
        }
        if (url.includes('/owner/ai/providers')) {
          return jsonResponse(200, { data: { providers: [], rateCards: [], services: [] } });
        }
        return jsonResponse(200, { data: [] });
      }),
    );
  }

  it('shows Release 2 SaaS & AI sections in navigation and commercial KPIs on overview', async () => {
    await stubOwnerR2Fetch();
    renderAt('/owner/overview');

    expect(await screen.findByText('Monthly recurring revenue', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('MRR by subscription plan')).toBeInTheDocument();
    const { within } = await import('@testing-library/react');
    const nav = screen.getByLabelText(/owner console navigation/i);
    expect(within(nav).getByRole('button', { name: 'Plans & pricing' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Subscriptions' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Billing & revenue' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'AI & credits' })).toBeInTheDocument();
  }, 15000);

  it('renders Plans, Subscriptions, Billing and AI Credits pages on their routes', async () => {
    await stubOwnerR2Fetch();
    const { cleanup } = await import('@testing-library/react');

    renderAt('/owner/plans');
    expect(await screen.findByRole('heading', { name: 'Plans & feature entitlements' }, { timeout: 5000 })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/subscriptions');
    expect(await screen.findByRole('heading', { name: 'Subscriptions & trials' }, { timeout: 5000 })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/billing');
    expect(await screen.findByRole('heading', { name: 'Billing & revenue' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Revenue summary' }, { timeout: 5000 })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/ai');
    expect(await screen.findByRole('heading', { name: 'AI usage & credits' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Credit wallets & ledger' }, { timeout: 5000 })).toBeInTheDocument();
  }, 15000);
});

describe('browser storage of campus records (live API mode)', () => {
  it('never keeps the campus dataset in localStorage and removes an old copy', async () => {
    localStorage.setItem('chromolog-campus-data', JSON.stringify({ students: [{ id: 1, name: 'Old copy' }] }));
    const staffUser = { id: 7, name: 'Admin', email: 'admin@demo.com', role: 'institution_admin', permissions: [] };
    localStorage.setItem('chromolog-campus-auth', JSON.stringify({ token: '1|tok', user: staffUser }));
    const bootstrap = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/notifications')) {
        return jsonResponse(200, { data: [], meta: { unreadCount: 0, total: 0 } });
      }
      if (url.endsWith('/dashboards')) {
        return jsonResponse(200, { data: [], templates: [], defaultTemplate: 'student' });
      }
      if (url.endsWith('/dashboards/home')) {
        return jsonResponse(200, { data: null });
      }
      return jsonResponse(200, { user: staffUser, data: { ...emptyDataset, students: [{ id: 99, name: 'Real Student' }] } });
    });
    vi.stubGlobal('fetch', bootstrap);

    renderAt('/app/dashboard');

    await vi.waitFor(() => expect(bootstrap).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(localStorage.getItem('chromolog-campus-data')).toBeNull();
  });
});
