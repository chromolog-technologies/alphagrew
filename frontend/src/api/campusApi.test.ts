import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiError';
import {
  SESSION_EXPIRED_EVENT,
  fetchCampusBootstrap,
  isMfaChallenge,
  loginWithCampusApi,
  verifyOwnerMfa,
} from './campusApi';
import { mockFetch } from '../test/mockFetch';

describe('campus API request helper', () => {
  it('returns the body of a successful campus login response', async () => {
    const fetchMock = mockFetch(200, { token: '1|abc', user: { id: 1 } });

    await expect(loginWithCampusApi('admin@demo.com', 'demo123')).resolves.toMatchObject({ token: '1|abc' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/login');
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'admin@demo.com',
      password: 'demo123',
      portal: 'campus',
    });
    // Laravel needs it to answer validation errors with JSON instead of a redirect.
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });

  it('targets /owner/auth/login and identifies an MFA challenge response', async () => {
    const fetchMock = mockFetch(200, { mfaRequired: true, challengeToken: 'mfa-chal-1' });

    const result = await loginWithCampusApi('owner@demo.com', 'demo123', 'owner');
    expect(isMfaChallenge(result)).toBe(true);
    expect(result).toEqual({ mfaRequired: true, challengeToken: 'mfa-chal-1' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/owner/auth/login');
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'owner@demo.com',
      password: 'demo123',
      portal: 'owner',
    });
  });

  it('submits MFA verification codes to /auth/mfa/verify', async () => {
    const fetchMock = mockFetch(200, { token: '1|owner', user: { id: 9, role: 'super_admin' }, data: {} });

    await expect(verifyOwnerMfa('mfa-chal-1', '123456')).resolves.toMatchObject({ token: '1|owner' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/mfa/verify');
    expect(JSON.parse(init.body as string)).toEqual({
      challengeToken: 'mfa-chal-1',
      code: '123456',
    });
  });

  it('preserves server error code on portal mismatch 403 responses', async () => {
    mockFetch(403, {
      message: 'Platform staff must sign in through the Owner Console.',
      code: 'use_owner_login',
    });

    const error = await loginWithCampusApi('owner@demo.com', 'demo123', 'campus').catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('use_owner_login');
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
