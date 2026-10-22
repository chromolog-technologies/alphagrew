import { vi } from 'vitest';

/** Replaces fetch with one that answers every request with the given JSON and status. */
export function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

export function signInAs(token = '1|test-token') {
  localStorage.setItem('chromolog-campus-auth', JSON.stringify({ token, user: { id: 1 } }));
}
