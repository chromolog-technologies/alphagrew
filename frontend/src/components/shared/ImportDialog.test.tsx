import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { ImportDialog } from './ImportDialog';

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    post: vi.fn((_path: string, body: FormData) =>
      Promise.resolve({
        data: body.get('dryRun')
          ? { dryRun: true, total: 2, valid: 1, created: 0, emailsNotSent: 0, failed: [{ row: 3, email: 'bad@x', errors: { departmentCode: 'The selected department code is invalid.' } }] }
          : { dryRun: false, total: 2, valid: 1, created: 1, emailsNotSent: 0, failed: [] },
      }),
    ),
  },
}));

describe('ImportDialog', () => {
  it('checks the file first, then imports the valid rows', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ImportDialog type="students" open onClose={vi.fn()} onImported={onImported} />
      </QueryClientProvider>,
    );

    const importButton = screen.getByRole('button', { name: /Import .*rows/ });
    expect(importButton).toBeDisabled();

    await user.upload(screen.getByLabelText('CSV file'), new File(['name,email\n'], 'students.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: 'Check file' }));

    expect(await screen.findByText('1 of 2 rows are ready to import.')).toBeInTheDocument();
    expect(screen.getByText('The selected department code is invalid.')).toBeInTheDocument();
    const firstCall = vi.mocked(http.post).mock.calls[0];
    expect(firstCall[0]).toBe('/imports/students');
    expect((firstCall[1] as FormData).get('dryRun')).toBe('1');

    await user.click(screen.getByRole('button', { name: /Import 1 rows/ }));
    expect(await screen.findByText('1 imported, 0 skipped.')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });
});
