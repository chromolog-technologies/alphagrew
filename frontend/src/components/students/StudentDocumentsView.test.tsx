import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { StudentDocumentsView } from './StudentDocumentsView';

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn(() =>
      Promise.resolve({
        data: [{ id: 1, studentId: 5, type: 'certificate', title: 'NPTEL', originalName: 'n.pdf', mimeType: 'application/pdf', sizeBytes: 9, status: 'rejected', reviewRemarks: 'Blurry scan', reviewedAt: null, uploadedAt: null }],
      }),
    ),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

describe('StudentDocumentsView', () => {
  it('lists documents with review remarks and uploads a new one', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentDocumentsView />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Rejected: Blurry scan/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Aadhaar');
    await user.selectOptions(screen.getByLabelText('Type'), 'id_proof');
    await user.upload(screen.getByLabelText(/^File/), new File(['x'], 'id.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    // The mutation runs on the next tick.
    await vi.waitFor(() => expect(vi.mocked(http.post)).toHaveBeenCalled());
    const [path, body] = vi.mocked(http.post).mock.calls[0];
    expect(path).toBe('/students/me/documents');
    expect((body as FormData).get('type')).toBe('id_proof');
    expect((body as FormData).get('title')).toBe('Aadhaar');
  });
});
