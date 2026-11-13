import { describe, expect, it, vi } from 'vitest';
import { ApiError, isApiError } from './apiError';
import { apiCall } from './apiClient';
import { fetchCampusBootstrap } from './campusApi';
import { apiFetch, getStoredToken, SAMPLE_DATA_EVENT } from './core';
import { http } from './http';
import { mockFetch, signInAs } from '../test/mockFetch';

describe('shared API core', () => {
  it('throws the same ApiError type from every client', async () => {
    signInAs();
    mockFetch(422, { message: 'Invalid.', errors: { name: ['Required.'] } });

    const errors = await Promise.all([
      http.get('/a').catch((error: unknown) => error),
      apiCall('/b').catch((error: unknown) => error),
      fetchCampusBootstrap('1|tok').catch((error: unknown) => error),
    ]);

    for (const error of errors) {
      expect(isApiError(error)).toBe(true);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).fieldErrors).toEqual({ name: ['Required.'] });
      expect((error as ApiError).firstFieldErrors).toEqual({ name: 'Required.' });
      expect((error as ApiError).fieldError('name')).toBe('Required.');
    }
  });

  it('prefers the current session token over the legacy key', () => {
    localStorage.setItem('auth_token', 'old');
    signInAs('2|current');

    expect(getStoredToken()).toBe('2|current');
  });

  it('falls back to the legacy key when there is no session', () => {
    localStorage.setItem('auth_token', 'legacy');

    expect(getStoredToken()).toBe('legacy');
  });

  it('reports responses marked as sample data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json', 'X-Data-Source': 'sample' } })),
    );
    const listener = vi.fn();
    window.addEventListener(SAMPLE_DATA_EVENT, listener);

    await apiFetch('/staff/dashboard', { token: null });

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ path: '/staff/dashboard' });
    window.removeEventListener(SAMPLE_DATA_EVENT, listener);
  });

  it('sends FormData without a JSON content type', async () => {
    const fetchMock = mockFetch(200, {});
    const form = new FormData();
    form.append('file', new Blob(['x']), 'a.txt');

    await apiFetch('/upload', { method: 'POST', body: form, token: '1|t' });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.body).toBe(form);
  });
});
