import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { GradeScalesPanel } from './GradeScalesPanel';

vi.mock('../../api/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/http')>();
  return {
    ...actual,
    http: {
      get: vi.fn((path: string) =>
        Promise.resolve(
          path === '/grade-rules'
            ? { data: [{ id: 1, grade: 'O', gradePoint: 10, minScore: 90, maxScore: 100, isPass: true, description: null, sortOrder: 0 }] }
            : { data: [{ id: 5, subjectId: 3, semesterId: 1, subject: { id: 3, code: 'DS101', name: 'Statistics' }, semester: { id: 1, name: 'Semester 1' }, internalMax: 40, externalMax: 60, totalMax: 100, internalPass: 0, externalPass: 24, totalPass: 40, extraMarksAllowed: 0, isActive: true }] },
        ),
      ),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ message: 'ok' })),
    },
  };
});

vi.mock('../../api/apiClient', () => ({
  apiCall: vi.fn(() => Promise.resolve([])),
  semesterApi: { list: vi.fn(() => Promise.resolve([])) },
}));

function renderPanel(canEdit: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GradeScalesPanel canEdit={canEdit} />
    </QueryClientProvider>,
  );
}

describe('GradeScalesPanel', () => {
  it('shows the scale and schemes read-only without marks.create', async () => {
    renderPanel(false);

    expect(await screen.findByText('90 – 100')).toBeInTheDocument();
    expect(await screen.findByText('DS101 · Statistics')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add grade/ })).not.toBeInTheDocument();
  });

  it('adds a grade', async () => {
    const user = userEvent.setup();
    renderPanel(true);

    await screen.findByText('90 – 100');
    await user.click(screen.getByRole('button', { name: /Add grade/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Grade \*/), 'A+');
    await user.type(within(dialog).getByLabelText(/^Grade point/), '9');
    await user.type(within(dialog).getByLabelText(/^From %/), '80');
    await user.type(within(dialog).getByLabelText(/^To %/), '89.99');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(vi.mocked(http.post)).toHaveBeenCalledWith('/grade-rules', { grade: 'A+', gradePoint: 9, minScore: 80, maxScore: 89.99, isPass: true, description: null });
  });
});
