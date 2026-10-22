import { describe, expect, it, vi } from 'vitest';
import { ApiError, http, withQuery } from './http';
import { SESSION_EXPIRED_EVENT } from './campusApi';
import { mockFetch, signInAs } from '../test/mockFetch';

describe('http client', () => {
  it('sends the stored token and parses JSON', async () => {
    signInAs('7|abc');
    const fetchMock = mockFetch(200, { data: [1, 2] });

    await expect(http.get('/things', { page: 2, search: '' })).resolves.toEqual({ data: [1, 2] });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/things?page=2');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer 7|abc');
  });

  it('turns a 422 into field errors', async () => {
    mockFetch(422, { message: 'The email field is required.', errors: { email: ['The email field is required.'] } });

    const error = (await http.post('/invitations', {}).catch((caught: unknown) => caught)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.firstFieldErrors).toEqual({ email: 'The email field is required.' });
  });

  it('signs the user out on a 401 when a token was sent', async () => {
    signInAs();
    mockFetch(401, { message: 'Unauthenticated.' });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(http.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('never sends the token on public requests', async () => {
    signInAs();
    const fetchMock = mockFetch(200, { message: 'ok' });

    await http.public.post('/auth/forgot-password', { email: 'a@b.c' });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('gives a readable message for 429 without a body message', async () => {
    mockFetch(429, {});

    await expect(http.get('/x')).rejects.toThrow('Too many requests. Wait a minute and try again.');
  });

  it('builds query strings without empty values', () => {
    expect(withQuery('/a', { x: 1, y: '', z: null, w: undefined, b: false })).toBe('/a?x=1&b=false');
    expect(withQuery('/a')).toBe('/a');
  });
});
