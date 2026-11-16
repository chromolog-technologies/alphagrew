import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { TimetableModule } from './TimetableModule';

const saveMutate = vi.fn();

// Stable objects and implementations: test/setup.ts restores mocks after each test.
const mocks = vi.hoisted(() => ({
  classes: { data: [{ id: 3, name: 'DS 2025 A' }], isLoading: false },
  timetable: {
    data: [
      {
        id: 1, classId: 3, subjectId: 10, facultyId: 21, dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', roomNumber: 'B1',
        sessionType: 'lecture', effectiveFrom: '2026-06-01', effectiveTo: null, class: null,
        subject: { id: 10, name: 'Statistics', code: 'DS101' }, faculty: { id: 21, name: 'Meera Nair' },
      },
    ],
    isLoading: false,
    error: null,
  },
}));

vi.mock('../../api/academicsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/academicsApi')>()),
  useClasses: vi.fn(() => mocks.classes),
  useTimetables: vi.fn(() => mocks.timetable),
  useSaveTimetable: vi.fn(() => ({ mutate: saveMutate, reset: vi.fn(), isPending: false, error: null })),
  useDeleteTimetable: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
}));

vi.mock('../../api/apiClient', () => ({
  apiCall: vi.fn((path: string) =>
    Promise.resolve(path === '/staff' ? [{ id: 21, name: 'Meera Nair' }] : [{ id: 10, name: 'Statistics', code: 'DS101' }]),
  ),
}));

function renderModule() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TimetableModule />
    </QueryClientProvider>,
  );
}

describe('TimetableModule', () => {
  it('shows the week of the selected class', () => {
    renderModule();

    const monday = screen.getByRole('list', { name: 'Monday sessions' });
    expect(within(monday).getByText('09:00–10:00 · DS101')).toBeInTheDocument();
    expect(within(monday).getByText(/Meera Nair · B1 · lecture/)).toBeInTheDocument();
  });

  it('adds a session on the chosen day', async () => {
    const user = userEvent.setup();
    saveMutate.mockClear();
    renderModule();

    await user.click(screen.getByRole('button', { name: 'Add session on Wednesday' }));
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByRole('option', { name: 'DS101 · Statistics' });
    await within(dialog).findByRole('option', { name: 'Meera Nair' });
    await user.selectOptions(within(dialog).getByLabelText(/^Subject/), '10');
    await user.selectOptions(within(dialog).getByLabelText(/^Faculty/), '21');
    await user.type(within(dialog).getByLabelText(/^Room/), 'Lab 2');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(saveMutate).toHaveBeenCalledWith(
      {
        id: null,
        input: { classId: 3, subjectId: 10, facultyId: 21, dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00', roomNumber: 'Lab 2', sessionType: 'lecture' },
      },
      expect.anything(),
    );
  });
});
