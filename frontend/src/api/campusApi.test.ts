import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiError';
import { SESSION_EXPIRED_EVENT, fetchCampusBootstrap, loginWithCampusApi } from './campusApi';
import { mockFetch } from '../test/mockFetch';

describe('campus API request helper', () => {
  it('returns the body of a successful response', async () => {
    const fetchMock = mockFetch(200, { token: '1|abc', user: { id: 1 } });

    await expect(loginWithCampusApi('admin@demo.com', 'demo123')).resolves.toMatchObject({ token: '1|abc' });

    // Laravel needs it to answer validation errors with JSON instead of a redirect.
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });

  it('rejects a failed response with the server message', async () => {
    mockFetch(422, { message: 'These credentials do not match our records.', errors: { email: ['These credentials do not match our records.'] } });

    const error = await loginWithCampusApi('admin@demo.com', 'wrong').catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('These credentials do not match our records.');
  });

  it('signs the user out when the token is rejected', async () => {
    mockFetch(401, { message: 'Unauthenticated.' });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(fetchCampusBootstrap('1|expired')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});
