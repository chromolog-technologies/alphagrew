import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { AttendanceRecords } from './AttendanceRecords';

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn(() =>
      Promise.resolve({
        attendance: [
          { id: 9, attendance_date: '2026-11-16', status: 'absent', remarks: null, is_approved: false, student: { id: 1, name: 'Rahul Sharma' }, subject: { id: 3, name: 'Stats', code: 'DS101' } },
        ],
      }),
    ),
    put: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
    post: vi.fn(),
  },
}));

function renderRecords() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AttendanceRecords />
    </QueryClientProvider>,
  );
}

describe('AttendanceRecords', () => {
  it('corrects a status and deletes a wrong record', async () => {
    const user = userEvent.setup();
    renderRecords();

    await user.selectOptions(await screen.findByLabelText('Status of Rahul Sharma'), 'present');
    expect(vi.mocked(http.put)).toHaveBeenCalledWith('/attendance/9', { status: 'present', remarks: null });

    await user.click(screen.getByRole('button', { name: 'Delete attendance of Rahul Sharma' }));
    expect(vi.mocked(http.delete)).toHaveBeenCalledWith('/attendance/9');
  });
});
