import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job, PlacementState } from '../../api/placementApi';
import { signInAs } from '../../test/mockFetch';
import { NotificationBell } from '../notifications/NotificationCenter';
import { draftsToRules } from './JobEditorSheet';
import { StudentJobsView } from './StudentJobsView';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const job = (id: number, patch: Partial<Job>): Job => ({
  id,
  title: `Role ${id}`,
  description: null,
  employmentType: 'full_time',
  location: 'Chennai',
  ctcMinLpa: 6,
  ctcMaxLpa: 8,
  stipendMonthly: null,
  packageDisplay: '6–8 LPA',
  openings: 3,
  requiredSkills: ['Java'],
  applyDeadline: new Date(Date.now() + 5 * 864e5).toISOString(),
  driveDate: null,
  status: 'open',
  isOpen: true,
  publishedAt: null,
  company: { id: id, name: `Company ${id}`, industry: null, website: null, logoUrl: null },
  ...patch,
});

const placement: PlacementState = {
  optedOut: false,
  debarredUntil: null,
  debarReason: null,
  placedAt: null,
  policy: { oneOfferRule: true, dreamOfferEnabled: false, dreamOfferMinCtc: null, maxActiveApplications: null, minProfileCompletion: 0, offerResponseDays: 7 },
};

const renderWithClient = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  signInAs();
});

describe('StudentJobsView', () => {
  beforeEach(() => {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/v1/students/me/jobs') {
        return json({
          data: [
            job(1, { assessment: { eligible: false, canApply: false, blockers: [], rules: [{ field: 'cgpa', label: 'CGPA', operator: 'gte', expected: '≥ 7.5', actual: '6.8', passed: false }] } }),
            job(2, { assessment: { eligible: true, canApply: true, blockers: [], rules: [{ field: 'cgpa', label: 'CGPA', operator: 'gte', expected: '≥ 6', actual: '6.8', passed: true }] } }),
          ],
          placement,
        });
      }
      if (url === '/api/v1/students/me/applications') return json({ data: [] });
      if (url === '/api/v1/students/me/jobs/2/apply' && init?.method === 'POST') return json({ data: { id: 9, status: 'applied' } }, 201);
      return json({ message: 'Not found' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('shows why the student cannot apply and lets them apply where they can', async () => {
    renderWithClient(<StudentJobsView />);
    const user = userEvent.setup();

    expect(await screen.findByText('Role 1')).toBeInTheDocument();
    expect(screen.getByText('Not eligible')).toBeInTheDocument();
    expect(screen.getByLabelText('Why you cannot apply')).toHaveTextContent('CGPA: needs ≥ 7.5, you have 6.8');

    const [blocked, open] = screen.getAllByRole('button', { name: 'Apply' });
    expect(blocked).toBeDisabled();
    await user.click(open);

    expect(await screen.findByText('Applied to Role 2 at Company 2.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/v1/students/me/jobs/2/apply')).toBe(true);
  });

  it('filters to jobs the student can apply to', async () => {
    renderWithClient(<StudentJobsView />);
    const user = userEvent.setup();
    await screen.findByText('Role 1');

    await user.click(screen.getByLabelText('Only jobs I can apply to'));

    expect(screen.queryByText('Role 1')).not.toBeInTheDocument();
    expect(screen.getByText('Role 2')).toBeInTheDocument();
  });
});

describe('job editor rules', () => {
  it('turns the rule rows into API rules and drops empty ones', () => {
    expect(draftsToRules([
      { field: 'cgpa', operator: 'gte', text: '7.5' },
      { field: 'department', operator: 'in', text: 'cse, ece ,' },
      { field: 'active_backlogs', operator: 'lte', text: '' },
    ])).toEqual([
      { field: 'cgpa', operator: 'gte', value: 7.5 },
      { field: 'department', operator: 'in', value: ['CSE', 'ECE'] },
    ]);
  });
});

describe('NotificationBell', () => {
  it('shows the unread count and opens the linked page', async () => {
    fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/api/v1/notifications?')) {
        return json({
          data: [{ id: 'a1', type: 'JobPublished', category: 'placement', title: 'A new job you are eligible for', body: 'Acme is hiring.', link: 'placement?job=4', data: {}, readAt: null, createdAt: new Date().toISOString() }],
          meta: { currentPage: 1, lastPage: 1, total: 1, unreadCount: 1 },
        });
      }
      if (url === '/api/v1/notifications/a1/read') return json({ unreadCount: 0 });
      return json({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
    const onNavigate = vi.fn();
    renderWithClient(<NotificationBell onNavigate={onNavigate} onOpenAll={() => undefined} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    await user.click(await screen.findByText('A new job you are eligible for'));

    expect(onNavigate).toHaveBeenCalledWith('placement', { job: '4' });
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/v1/notifications/a1/read')).toBe(true);
  });
});
