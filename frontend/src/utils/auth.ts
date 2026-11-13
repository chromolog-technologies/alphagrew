/**
 * Session helpers for screens that read the signed-in user's token or profile directly.
 * The token comes from the one shared reader in api/core.ts.
 */
import { AUTH_STORAGE_KEY, getStoredToken } from '../api/core';

export function getStoredAuthToken(): string | null {
  return getStoredToken();
}

export function getStoredAuthUser(): any | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.user ?? null;
  } catch {
    return null;
  }
}
