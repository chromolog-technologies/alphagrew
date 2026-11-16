import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/apiError';
import { AcademicYearModule } from './AcademicYearModule';
import { SubjectAllocationsDialog } from './SubjectAllocationsDialog';

const allocateMutate = vi.fn();
const deallocateMutate = vi.fn();
const saveYearMutate = vi.fn();

// Stable objects and implementations: test/setup.ts restores mocks after each test.
const mocks = vi.hoisted(() => ({
  allocations: {
    data: [
      {
        id: 7, subjectId: 3, semesterId: 5, facultyId: 21, allocatedFrom: '2026-06-01', allocatedTo: null,
        subject: { id: 3, name: 'DBMS', code: 'CS301' }, semester: { id: 5, name: 'Semester 5' }, faculty: { id: 21, name: 'Meera Nair', email: 'm@x' },
      },
    ],
    isLoading: false,
  },
  years: {
    data: [{ id: 1, year: '2025-2026', code: 'AY2526', startDate: '2025-06-01', endDate: '2026-05-31', isActive: true, semestersCount: 2 }],
    isLoading: false,
    error: null,
  },
  allocateError: { current: null as unknown },
}));

vi.mock('../../api/academicsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/academicsApi')>()),
  useSubjectAllocations: vi.fn(() => mocks.allocations),
  useAllocate: vi.fn(() => ({ mutate: allocateMutate, reset: vi.fn(), isPending: false, error: mocks.allocateError.current })),
  useDeallocate: vi.fn(() => ({ mutate: deallocateMutate, reset: vi.fn(), isPending: false, error: null })),
  useAcademicYears: vi.fn(() => mocks.years),
  useSaveAcademicYear: vi.fn(() => ({ mutate: saveYearMutate, reset: vi.fn(), isPending: false, error: null })),
  useDeleteAcademicYear: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
}));

vi.mock('../../api/apiClient', () => ({
  apiCall: vi.fn(() => Promise.resolve([{ id: 21, name: 'Meera Nair' }, { id: 22, name: 'Arjun Nair' }])),
  semesterApi: { list: vi.fn(() => Promise.resolve([{ id: 5, name: 'Semester 5' }, { id: 6, name: 'Semester 6' }])) },
}));

function withClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('SubjectAllocationsDialog', () => {
  it('lists, adds and removes the faculty who teach a subject', async () => {
    const user = userEvent.setup();
    allocateMutate.mockClear();
    deallocateMutate.mockClear();
    mocks.allocateError.current = null;
    withClient(<SubjectAllocationsDialog subject={{ id: 3, name: 'DBMS', code: 'CS301' }} onClose={vi.fn()} />);

    const list = screen.getByRole('list', { name: 'Allocated faculty' });
    expect(within(list).getByText('Meera Nair')).toBeInTheDocument();

    // Options load asynchronously.
    await screen.findByRole('option', { name: 'Semester 6' });
    await screen.findByRole('option', { name: 'Arjun Nair' });
    await user.selectOptions(screen.getByLabelText('Semester'), '6');
    await user.selectOptions(screen.getByLabelText('Faculty'), '22');
    await user.click(screen.getByRole('button', { name: /Allocate/ }));
    expect(allocateMutate).toHaveBeenCalledWith({ subjectId: 3, semesterId: 6, facultyId: 22 }, expect.anything());

    await user.click(screen.getByRole('button', { name: 'Remove Meera Nair from Semester 5' }));
    expect(deallocateMutate).toHaveBeenCalledWith(7);
  });

  it('shows the server message for a rejected allocation', () => {
    mocks.allocateError.current = new ApiError('Invalid', 422, { facultyId: ['This staff member already teaches the subject in that semester.'] });
    withClient(<SubjectAllocationsDialog subject={{ id: 3, name: 'DBMS', code: 'CS301' }} onClose={vi.fn()} />);

    expect(screen.getByText('This staff member already teaches the subject in that semester.')).toBeInTheDocument();
    mocks.allocateError.current = null;
  });
});

describe('AcademicYearModule', () => {
  it('lists years and saves a new one', async () => {
    const user = userEvent.setup();
    saveYearMutate.mockClear();
    withClient(<AcademicYearModule />);

    expect(screen.getByText('2025-2026')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add academic year/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Name/), '2026-2027');
    await user.type(within(dialog).getByLabelText(/^Code/), 'AY2627');
    await user.type(within(dialog).getByLabelText(/^Starts/), '2026-06-01');
    await user.type(within(dialog).getByLabelText(/^Ends/), '2027-05-31');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(saveYearMutate).toHaveBeenCalledWith(
      { id: null, input: { year: '2026-2027', code: 'AY2627', startDate: '2026-06-01', endDate: '2027-05-31', isActive: false } },
      expect.anything(),
    );
  });

  it('does not offer to delete a year that has semesters', async () => {
    const user = userEvent.setup();
    withClient(<AcademicYearModule />);

    await user.click(screen.getByRole('button', { name: 'Delete 2025-2026' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
