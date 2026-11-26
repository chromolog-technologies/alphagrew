import { describe, expect, it, vi } from 'vitest';
import { downloadExport } from './exportsApi';

vi.mock('./core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./core')>()),
  apiBaseUrl: 'https://api.test/api/v1',
  getStoredToken: () => 'tok',
}));

describe('downloadExport', () => {
  it('fetches the CSV with the token and saves it', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('a,b\n', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="attendance-2026-11-16.csv"' } })),
    );
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await downloadExport('attendance', { from: '2026-11-16', to: '2026-11-16' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/exports/attendance?from=2026-11-16&to=2026-11-16',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    );
    expect(click).toHaveBeenCalled();
  });

  it('reports the server message when the export is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ message: 'You cannot export results.' }), { status: 403 }))));

    await expect(downloadExport('results')).rejects.toThrow('You cannot export results.');
  });
});
