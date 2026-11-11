import { cleanup, render, screen, within } from '@testing-library/react';
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

async function stubOwnerFullFetch() {
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
            currency: 'INR',
            period: { preset: '30d', from: '2026-10-12', to: '2026-11-11' },
            institutions: {
              total: 2,
              active: 1,
              trial: 1,
              suspended: 0,
              newInPeriod: 1,
              pendingVerification: 0,
              byStatus: { prospect: 0, trial: 1, active: 1, suspended: 0, expired: 0, closed: 0 },
            },
            users: {
              total: 10,
              activeInPeriod: 8,
              newInPeriod: 2,
              activeSessions: 2,
              byRole: { student: 6, faculty: 2, hod: 1, institution_admin: 1 },
            },
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
            ai: {
              calls: 12,
              failures: 0,
              tokens: 3000,
              estimatedCostUsd: 0.02,
              creditsAllocated: 2500,
              creditsConsumed: 50,
              creditsRemaining: 2450,
              creditsUsedInPeriod: 50,
              note: 'Test ledger',
            },
            system: {
              status: 'ok',
              openIncidents: 0,
              openSecurityEvents: 0,
              checks: [
                { key: 'database', label: 'Database', status: 'ok', detail: 'Connected' },
                { key: 'queue', label: 'Queue worker', status: 'ok', detail: '0 failed jobs' },
              ],
              database: { ok: true },
              queue: { driver: 'sync', failedJobs: 0 },
              storage: { ok: true },
              maintenanceMode: false,
              environment: 'testing',
              version: 'test',
            },
            generatedAt: '2026-11-11T10:00:00Z',
          },
        });
      }
      if (url.includes('/owner/dashboard/trends') || url.includes('/owner/dashboard/alerts') || url.includes('/owner/dashboard/activity')) {
        return jsonResponse(200, { data: [] });
      }
      if (url.includes('/owner/institutions')) {
        return jsonResponse(200, {
          data: [
            {
              id: 1,
              code: 'DEMO',
              name: 'Demo Institute of Technology',
              institutionType: 'college',
              status: 'active',
              verificationStatus: 'verified',
              hasLogo: false,
              officialEmail: 'office@demo.edu',
              contactPhone: '+91 98765 00001',
              country: 'India',
              state: 'Karnataka',
              address: 'Bengaluru',
              usersCount: 120,
              studentsCount: 100,
              createdAt: '2026-01-01T00:00:00Z',
            },
          ],
          meta: { total: 1, page: 1, perPage: 20, lastPage: 1 },
        });
      }
      if (url.includes('/owner/oversight/academic')) {
        return jsonResponse(200, {
          data: {
            totals: { institutions: 1, campuses: 2, departments: 5, courses: 6, batches: 4, academicYears: 1, semesters: 8, students: 100 },
            institutions: [],
          },
        });
      }
      if (url.includes('/owner/oversight/placement')) {
        return jsonResponse(200, {
          data: {
            totals: { companies: 4, drives: 2, jobPostings: 3, applications: 20, shortlisted: 8, offers: 5, placements: 4, placementRatePercent: 20, avgCtcLpa: 8.5, maxCtcLpa: 14 },
            institutions: [],
          },
        });
      }
      if (url.includes('/owner/oversight/assessments')) {
        return jsonResponse(200, {
          data: {
            readOnlyNotice: 'Aggregates only.',
            totals: { exams: 3, scheduled: 1, ongoing: 0, completed: 2, markEntries: 50, absentEntries: 1, passRatePercent: 92, avgMarks: 78, avgSemesterPercentage: 76.5 },
            institutions: [],
          },
        });
      }
      if (url.includes('/owner/oversight/resumes')) {
        return jsonResponse(200, {
          data: {
            privacyNotice: 'No raw resume files or PII exposed.',
            totals: { uploads: 40, parsed: 38, failed: 2, analyses: 38, avgOverallScore: 79, avgAtsScore: 82, aiCalls: 38, aiFailures: 1, avgLatencyMs: 920, estimatedCostUsd: 0.21 },
            institutions: [],
          },
        });
      }
      if (url.includes('/owner/oversight/interviews')) {
        return jsonResponse(200, {
          data: {
            disclaimer: 'Assistive readiness signals only.',
            totals: { sessions: 12, completed: 10, inProgress: 1, failed: 1, abandoned: 0, evaluated: 10, avgScore: 74.2, aiCalls: 48, aiFailures: 1, avgLatencyMs: 650, estimatedCostUsd: 0.45 },
            byMode: { technical: 8, behavioral: 4 },
            institutions: [],
          },
        });
      }
      if (url.includes('/owner/reports/catalog')) {
        return jsonResponse(200, {
          data: [
            { key: 'institution', label: 'Institution Master & Health', description: 'Tenant scale and status.' },
            { key: 'revenue', label: 'Billing & Revenue Report', description: 'Invoices and collections.' },
          ],
        });
      }
      if (url.includes('/owner/reports/preview')) {
        return jsonResponse(200, {
          data: {
            key: 'institution',
            label: 'Institution Master & Health',
            columns: ['Code', 'Institution', 'Status'],
            rows: [['DEMO', 'Demo Institute', 'active']],
            summary: { totalInstitutions: 1 },
          },
        });
      }
      if (url.includes('/owner/support/tickets')) {
        return jsonResponse(200, {
          data: [],
          summary: { open: 1, escalated: 0, slaBreached: 0, avgCsat: 4.8 },
        });
      }
      if (url.includes('/owner/data/backups')) {
        return jsonResponse(200, {
          data: [],
          alerts: { backupOverdue24h: false, unverifiedRestores: 0 },
        });
      }
      return jsonResponse(200, { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } });
    }),
  );
}

describe('Owner Console SRS full parity (R1–R5)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('exposes full SRS navigation groups and period/posture controls on Overview', async () => {
    await stubOwnerFullFetch();
    renderAt('/owner/overview');

    expect(await screen.findByText('Monthly recurring revenue', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'YTD' })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter institutions by status/i)).toBeInTheDocument();
    expect(screen.getByText('Users by role')).toBeInTheDocument();
    expect(screen.getByText('System & security posture')).toBeInTheDocument();

    const nav = screen.getByLabelText(/owner console navigation/i);
    expect(within(nav).getByRole('button', { name: 'Module oversight' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Reports & analytics' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'CRM & onboarding' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Support & SLA' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Announcements & CMS' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Integrations & APIs' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Data & backups' })).toBeInTheDocument();
  }, 15000);

  it('renders Product Oversight, Reports & Analytics, and Customer Success & Infra pages on their routes', async () => {
    await stubOwnerFullFetch();

    renderAt('/owner/oversight');
    expect(await screen.findByRole('heading', { name: 'Product oversight' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Academic setup' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resume AI' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI Interviews' })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/reports');
    expect(await screen.findByRole('heading', { name: 'Reports & analytics' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Saved views' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Schedules' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Export audit log' })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/crm-onboarding');
    expect(await screen.findByRole('heading', { name: 'CRM & tenant onboarding' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /crm leads/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /onboarding pipeline/i })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/support');
    expect(await screen.findByRole('heading', { name: 'Support & SLA operations' }, { timeout: 5000 })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/communications');
    expect(await screen.findByRole('heading', { name: 'Communications, CMS & releases' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'CMS & FAQs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Product releases' })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/integrations');
    expect(await screen.findByRole('heading', { name: 'Integrations, API keys & webhooks' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'API clients' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Webhooks' })).toBeInTheDocument();
    cleanup();

    renderAt('/owner/data-backups');
    expect(await screen.findByRole('heading', { name: 'Data governance & backups' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /backups & restore drills/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /export & deletion requests/i })).toBeInTheDocument();
  }, 20000);
});
