import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

const ownerUser = {
  id: 1,
  name: 'Platform Owner',
  email: 'owner@demo.com',
  role: 'super_admin',
  permissions: [],
  ownerPermissions: ['owner.*'],
  platformRole: 'super_admin',
};

async function stubOwnerLogsFetch() {
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

  const requestedUrls: string[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      requestedUrls.push(url);

      if (url.endsWith('/campus/bootstrap')) {
        return jsonResponse(200, { user: ownerUser, data: emptyDataset });
      }
      if (url.includes('/owner/users/12')) {
        return jsonResponse(200, {
          data: {
            id: 12,
            name: 'Meera Kulkarni',
            email: 'riverside.admin@demo.com',
            role: 'institution_admin',
            roleLabel: 'Institution Admin',
            platformRole: null,
            isPlatform: false,
            status: 'active',
            institutionId: 2,
            institution: 'Riverside Institute of Technology',
            mfaEnabled: true,
            lastLoginAt: '2026-11-11T09:00:00Z',
            createdAt: '2026-10-01T09:00:00Z',
            statusReason: null,
            title: 'Dean of Placements',
            phone: '+91 98765 00002',
            emailVerified: true,
            lockedUntil: null,
            activeSessions: 1,
            ownerPermissions: [],
            recentLogins: [],
          },
        });
      }
      if (url.includes('/owner/institutions/2/logs')) {
        return jsonResponse(200, {
          data: {
            institution: { id: 2, code: 'RIVERSIDE', name: 'Riverside Institute of Technology', status: 'active' },
            counts: { audit: 1, activity: 1, login: 1, security: 1, status: 1, subscription: 1, ai: 1, total: 7 },
            timeline: [
              {
                id: 'ai-1',
                category: 'ai',
                title: 'AI resume_analysis',
                detail: 'claude-3-5-sonnet · 3 credits · 520ms',
                statusOrSeverity: 'success',
                actor: 'riverside.admin@demo.com',
                ip: null,
                at: '2026-11-11T10:10:00Z',
                metadata: { provider: 'anthropic', promptTokens: 400, completionTokens: 120 },
              },
              {
                id: 'security-1',
                category: 'security',
                title: 'impossible_travel',
                detail: 'Login detected from new country',
                statusOrSeverity: 'high',
                actor: 'riverside.admin@demo.com',
                ip: '203.0.113.45',
                at: '2026-11-11T09:50:00Z',
                metadata: { country: 'SG' },
              },
            ],
            audit: [],
            activity: [],
            logins: [],
            security: [],
            status: [],
            subscription: [],
            ai: [],
          },
        });
      }
      if (url.includes('/owner/institutions/2/history')) {
        return jsonResponse(200, { data: { status: [], audit: [] } });
      }
      if (url.includes('/owner/institutions/2/settings')) {
        return jsonResponse(200, { data: { overrides: {}, allowedKeys: [], defaults: {} } });
      }
      if (/\/owner\/institutions\/2(\?|$)/.test(url)) {
        return jsonResponse(200, {
          data: {
            id: 2,
            code: 'RIVERSIDE',
            name: 'Riverside Institute of Technology',
            type: 'institute',
            status: 'active',
            verificationStatus: 'verified',
            officialEmail: 'office@riverside.edu',
            state: 'Maharashtra',
            trialEndsAt: null,
            usersCount: 14,
            studentsCount: 110,
            createdAt: '2026-10-01T00:00:00Z',
            registrationNumber: 'AICTE-2-0199',
            contactPhone: '+91 80 4123 9876',
            website: null,
            country: 'India',
            district: 'Pune',
            address: 'Pune, India',
            pincode: '411001',
            suspendedAt: null,
            suspensionReason: null,
            allowedTransitions: ['suspended', 'closed'],
            scheduledChange: null,
            counts: { campuses: 1, departments: 3, students: 110, staff: 12, admins: 1, users: 14 },
            admins: [{ id: 12, name: 'Meera Kulkarni', email: 'riverside.admin@demo.com', status: 'active', lastLoginAt: '2026-11-11T09:00:00Z' }],
            aiUsage30d: { calls: 12, estimatedCostUsd: 0.4 },
          },
        });
      }
      if (url.includes('/owner/institutions')) {
        return jsonResponse(200, {
          data: [
            {
              id: 2,
              code: 'RIVERSIDE',
              name: 'Riverside Institute of Technology',
              type: 'institute',
              status: 'active',
              verificationStatus: 'verified',
              officialEmail: 'office@riverside.edu',
              state: 'Maharashtra',
              trialEndsAt: null,
              usersCount: 14,
              studentsCount: 110,
              createdAt: '2026-10-01T00:00:00Z',
            },
          ],
          meta: { total: 1, currentPage: 1, perPage: 20, lastPage: 1 },
        });
      }
      if (url.includes('/owner/activity-logs')) {
        return jsonResponse(200, {
          data: [
            {
              id: 42,
              action: 'updated',
              modelType: 'User',
              modelId: 12,
              actor: { id: 12, name: 'Meera Kulkarni', email: 'riverside.admin@demo.com', role: 'institution_admin' },
              institution: 'Riverside Institute of Technology',
              changes: { old: { name: 'Meera K.' }, new: { name: 'Meera Kulkarni' } },
              ip: '198.51.100.22',
              userAgent: 'Mozilla/5.0',
              at: '2026-11-11T10:05:00Z',
            },
          ],
          meta: { total: 1, currentPage: 1, perPage: 25, lastPage: 1 },
        });
      }
      if (url.includes('/owner/security-events')) {
        return jsonResponse(200, {
          data: [
            {
              id: 7,
              severity: 'high',
              eventType: 'impossible_travel',
              institution: 'Riverside Institute of Technology',
              email: 'riverside.admin@demo.com',
              ip: '203.0.113.45',
              summary: 'Login detected from new country',
              metadata: null,
              status: 'open',
              resolvedBy: null,
              resolvedAt: null,
              at: '2026-11-11T09:50:00Z',
            },
          ],
          meta: { total: 1, currentPage: 1, perPage: 25, lastPage: 1 },
        });
      }
      if (url.includes('/owner/sessions')) {
        return jsonResponse(200, {
          data: [
            {
              id: 99,
              device: 'Chrome on Windows',
              user: { id: 12, name: 'Meera Kulkarni', email: 'riverside.admin@demo.com', role: 'institution_admin' },
              institution: 'Riverside Institute of Technology',
              lastUsedAt: '2026-11-11T10:00:00Z',
              createdAt: '2026-11-11T08:00:00Z',
              expiresAt: null,
              current: false,
            },
          ],
        });
      }
      return jsonResponse(200, { data: [], meta: { total: 0, currentPage: 1, perPage: 25, lastPage: 1 } });
    }),
  );

  return requestedUrls;
}

describe('Unified College Logs workflows', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows college shortcut and unified 7-stream CollegeLogsPanel on User detail view', async () => {
    const requestedUrls = await stubOwnerLogsFetch();
    renderAt('/owner/users/12');

    expect(await screen.findByRole('heading', { name: 'Meera Kulkarni' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText('College logs — Riverside Institute of Technology')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open college profile' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /All timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI usage/i })).toBeInTheDocument();
    expect(await screen.findByText(/Login detected from new country/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /AI usage/i }));
    await waitFor(() => {
      expect(requestedUrls.some((u) => u.includes('/owner/institutions/2/logs') && u.includes('category=ai'))).toBe(true);
    });

    const inspectButtons = await screen.findAllByRole('button', { name: 'Inspect' });
    fireEvent.click(inspectButtons[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  }, 15000);

  it('adds College logs tab inside Institution detail view', async () => {
    await stubOwnerLogsFetch();
    renderAt('/owner/institutions/2');

    expect(await screen.findByRole('heading', { name: 'Riverside Institute of Technology' }, { timeout: 5000 })).toBeInTheDocument();
    const collegeLogsTab = screen.getByRole('tab', { name: 'College logs' });
    fireEvent.click(collegeLogsTab);

    expect(await screen.findByText('College logs — Riverside Institute of Technology')).toBeInTheDocument();
    expect(await screen.findByText(/AI resume analysis/i)).toBeInTheDocument();
  }, 15000);

  it('supports Activity log tab and institutionId query scoping on Audit & security page', async () => {
    const requestedUrls = await stubOwnerLogsFetch();
    renderAt('/owner/security?institutionId=2');

    expect(await screen.findByRole('heading', { name: 'Audit & security' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText(/Scoped to/i)).toBeInTheDocument();

    const activityTab = screen.getByRole('tab', { name: 'Activity log' });
    fireEvent.click(activityTab);

    expect(await screen.findByText('User #12')).toBeInTheDocument();
    expect(requestedUrls.some((u) => u.includes('/owner/activity-logs') && u.includes('institutionId=2'))).toBe(true);
    expect(requestedUrls.some((u) => u.includes('/owner/security-events') && u.includes('institutionId=2'))).toBe(true);
    expect(requestedUrls.some((u) => u.includes('/owner/sessions') && u.includes('institutionId=2'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Show all colleges' }));
    expect(screen.queryByText(/Scoped to/i)).not.toBeInTheDocument();
  }, 15000);
});

