import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { StudentLmsView } from './StudentLmsView';

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn((path: string) =>
      Promise.resolve(
        path === '/lms/my-subjects'
          ? { data: [{ id: 3, code: 'DS101', name: 'Statistics', materials: 1, openAssignments: 1 }] }
          : {
              data: {
                subject: { id: 3, code: 'DS101', name: 'Statistics' },
                canTeach: false,
                materials: [{ id: 5, subjectId: 3, title: 'Unit 1 notes', description: null, linkUrl: null, hasFile: true, originalName: 'u1.pdf', createdAt: null }],
                assignments: [{ id: 8, subjectId: 3, title: 'Problem set 1', instructions: 'Solve all', dueAt: '2030-01-01T10:00:00Z', maxMarks: 10, allowLate: false, isOpen: true, mySubmission: null }],
              },
            },
      ),
    ),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('StudentLmsView', () => {
  it('shows materials and submits an answer', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentLmsView />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Unit 1 notes')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Answer for Problem set 1'), 'My answer');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await vi.waitFor(() => expect(vi.mocked(http.post)).toHaveBeenCalled());
    const [path, body] = vi.mocked(http.post).mock.calls[0];
    expect(path).toBe('/lms/assignments/8/submit');
    expect((body as FormData).get('textAnswer')).toBe('My answer');
  });
});
