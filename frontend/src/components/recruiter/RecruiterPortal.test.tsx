import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { RecruiterAccountsDialog } from '../placement/RecruiterAccountsDialog';
import { RecruiterPortal } from './RecruiterPortal';

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn((path: string) => {
      if (path === '/recruiter/jobs') {
        return Promise.resolve({
          data: [{ id: 4, title: 'Data Engineer', location: 'Kochi', employmentType: null, status: 'published', packageDisplay: null, openings: 2, sharedCandidates: 1 }],
          meta: { company: { id: 1, name: 'Acme' } },
        });
      }
      if (path === '/recruiter/jobs/4/candidates') {
        return Promise.resolve({
          data: [{ applicationId: 9, status: 'shortlisted', student: { name: 'Asha', registrationNumber: 'R1', department: 'DSC', year: 'year_1', cgpa: 8.4 }, feedback: [] }],
        });
      }
      return Promise.resolve({ data: [{ id: 2, name: 'Priya', email: 'priya@acme.test', status: 'active', lastLoginAt: null }] });
    }),
    post: vi.fn(() => Promise.resolve({ data: { id: 3, emailSent: true } })),
    put: vi.fn(),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

const wrap = (node: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

describe('RecruiterPortal', () => {
  it('lists shared candidates and sends feedback with a note', async () => {
    const user = userEvent.setup();
    wrap(<RecruiterPortal />);

    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Acme · candidates')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Note for Asha'), 'Strong SQL');
    await user.click(screen.getByRole('button', { name: 'Recommend' }));

    await vi.waitFor(() => expect(http.post).toHaveBeenCalledWith('/recruiter/applications/9/feedback', { decision: 'recommend', note: 'Strong SQL' }));
  });
});

describe('RecruiterAccountsDialog', () => {
  it('lists, invites and removes recruiters of a company', async () => {
    const user = userEvent.setup();
    wrap(<RecruiterAccountsDialog open onClose={() => {}} companies={[{ id: 1, name: 'Acme' }]} />);

    await user.selectOptions(screen.getByLabelText('Company'), '1');
    expect(await screen.findByText('Priya')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Recruiter name'), 'Omar');
    await user.type(screen.getByLabelText('Recruiter email'), 'omar@acme.test');
    await user.click(screen.getByRole('button', { name: 'Invite' }));
    await vi.waitFor(() => expect(http.post).toHaveBeenCalledWith('/companies/1/recruiters', { name: 'Omar', email: 'omar@acme.test' }));
    expect(await screen.findByText(/Invitation sent/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Priya' }));
    await vi.waitFor(() => expect(http.delete).toHaveBeenCalledWith('/companies/1/recruiters/2'));
  });
});
