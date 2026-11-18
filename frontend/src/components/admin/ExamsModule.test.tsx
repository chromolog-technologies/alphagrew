import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ExamsModule } from './ExamsModule';

const saveMutate = vi.fn();

// Stable objects and implementations (not mockReturnValue): test/setup.ts restores mocks after each test.
const mocks = vi.hoisted(() => ({
  exams: {
    data: [
      {
        id: 1, name: 'DBMS Mid Term', subject_id: 10, exam_type_id: 2, semester_id: 5, exam_date: '2026-12-10T00:00:00.000000Z',
        start_time: '10:00', end_time: '11:30', duration_minutes: 90, location: 'Hall A', max_marks: 50, exam_mode: 'offline',
        status: 'scheduled', subject: { id: 10, name: 'DBMS', code: 'CS301' }, exam_type: { id: 2, name: 'Mid Term', code: 'MID' },
        mark_entries_count: 0,
      },
      {
        id: 2, name: 'OS End Semester', subject_id: 11, exam_type_id: 1, semester_id: 5, exam_date: '2026-11-01T00:00:00.000000Z',
        start_time: '09:00', end_time: '12:00', duration_minutes: 180, location: null, max_marks: 100, exam_mode: 'offline',
        status: 'conducted', subject: { id: 11, name: 'Operating Systems', code: 'CS302' }, exam_type: { id: 1, name: 'End Semester', code: 'ESE' },
        mark_entries_count: 42,
      },
    ],
    isLoading: false,
    error: null,
  },
  types: { data: [{ id: 1, name: 'End Semester', code: 'ESE', max_marks: 100 }, { id: 2, name: 'Mid Term', code: 'MID', max_marks: 50 }] },
  fieldDefinitions: { data: [], isLoading: false },
  noValues: { data: undefined, isLoading: false },
}));

vi.mock('../../api/examsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/examsApi')>()),
  useExams: vi.fn(() => mocks.exams),
  useExamTypes: vi.fn(() => mocks.types),
  useSaveExam: vi.fn(() => ({ mutate: saveMutate, reset: vi.fn(), isPending: false, error: null })),
  useDeleteExam: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
}));

vi.mock('../../api/apiClient', () => ({
  apiCall: vi.fn(() => Promise.resolve([{ id: 10, name: 'DBMS', code: 'CS301' }, { id: 11, name: 'Operating Systems', code: 'CS302' }])),
  semesterApi: { list: vi.fn(() => Promise.resolve([{ id: 5, name: 'Semester 5' }])) },
}));

vi.mock('../../api/customFieldsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/customFieldsApi')>()),
  useCustomFieldDefinitions: vi.fn(() => mocks.fieldDefinitions),
  useCustomFieldValues: vi.fn(() => mocks.noValues),
}));

function renderModule(canManage: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExamsModule canManage={canManage} />
    </QueryClientProvider>,
  );
}

describe('ExamsModule', () => {
  it('lists real exams and is read-only for staff who cannot manage them', () => {
    renderModule(false);

    expect(screen.getByText('DBMS Mid Term')).toBeInTheDocument();
    expect(screen.getByText('42 marks entered')).toBeInTheDocument();
    expect(screen.getByText('2026-12-10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Schedule exam/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit DBMS Mid Term/i })).not.toBeInTheDocument();
  });

  it('schedules an exam with the chosen subject, semester and type', async () => {
    const user = userEvent.setup();
    saveMutate.mockClear();
    renderModule(true);

    await user.click(screen.getByRole('button', { name: /Schedule exam/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Name/), 'CN Internal 1');
    await user.selectOptions(await within(dialog).findByLabelText(/^Subject/), '11');
    await user.selectOptions(await within(dialog).findByLabelText(/^Semester/), '5');
    await user.selectOptions(within(dialog).getByLabelText(/^Exam type/), '2');
    await user.type(within(dialog).getByLabelText(/^Date/), '2026-12-15');
    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }));

    expect(saveMutate).toHaveBeenCalledWith(
      {
        id: null,
        input: expect.objectContaining({
          name: 'CN Internal 1', subjectId: 11, semesterId: 5, examTypeId: 2, examDate: '2026-12-15',
          startTime: '10:00', endTime: '12:00', maxMarks: 50, examMode: 'offline', status: 'scheduled',
        }),
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('locks subject and semester, and blocks delete, once marks exist', async () => {
    const user = userEvent.setup();
    renderModule(true);

    await user.click(screen.getByRole('button', { name: 'Edit OS End Semester' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/^Subject/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/^Semester/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/^Status/)).not.toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'Delete OS End Semester' }));
    expect(screen.getByText(/Set its status to Cancelled instead/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
