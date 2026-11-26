import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { StudentProfileDialog } from './StudentProfileDialog';

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn((path: string) =>
      Promise.resolve(
        path.endsWith('/documents')
          ? { data: [{ id: 3, studentId: 5, type: 'mark_sheet', title: 'Class 12 marks', originalName: 'm.pdf', mimeType: 'application/pdf', sizeBytes: 100, status: 'pending', reviewRemarks: null, reviewedAt: null, uploadedAt: null }] }
          :path.endsWith('/profile')
          ? { data: { name: 'Rahul', email: 'r@x', registrationNumber: 'BIT1', departmentCode: 'CSE', headline: 'Aspiring data engineer', about: null, phone: null, city: 'Kochi', linkedinUrl: null, githubUrl: null, preferredRoles: [], completeness: { percent: 80 } } }
          : { data: { summary: { cgpa: 8.4, activeBacklogs: 0, backlogHistory: 1, attendancePercentage: 91, semestersPublished: 4, calculatedAt: null }, education: [{ id: 7, level: 'class_12', institutionName: 'Model School', boardOrUniversity: 'CBSE', yearOfPassing: 2022, scoreType: 'percentage', score: 92, verified: false, verificationRemarks: null }] } },
      ),
    ),
    post: vi.fn(() => Promise.resolve({})),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderDialog(canEdit: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudentProfileDialog student={{ id: 5, name: 'Rahul' }} canEdit={canEdit} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('StudentProfileDialog', () => {
  it('shows profile and academics, and lets admins verify education', async () => {
    const user = userEvent.setup();
    renderDialog(true);

    expect(await screen.findByText('Aspiring data engineer')).toBeInTheDocument();
    expect(await screen.findByText('8.4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(vi.mocked(http.post)).toHaveBeenCalledWith('/students/5/education/7/verify', { verified: true });

    await user.click(await screen.findByRole('button', { name: 'Verify Class 12 marks' }));
    expect(vi.mocked(http.post)).toHaveBeenCalledWith('/student-documents/3/review', { status: 'verified', remarks: undefined });
  });

  it('is read-only for staff', async () => {
    renderDialog(false);

    expect(await screen.findByText('Not verified')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recalculate/ })).not.toBeInTheDocument();
  });
});
