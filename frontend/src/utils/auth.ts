/**
 * Robust authentication storage helper for AlphaGrew frontend.
 * Retrieves Sanctum bearer token and session information with fallback
 * across both the primary 'chromolog-campus-auth' object and legacy 'auth_token'.
 */

const AUTH_KEY = 'chromolog-campus-auth';
const LEGACY_TOKEN_KEY = 'auth_token';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check legacy token string
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken && legacyToken.trim()) {
    return legacyToken.trim();
  }

  // 2. Check primary JSON session storage
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.token && typeof parsed.token === 'string') {
      return parsed.token.trim();
    }
  } catch {
    // If not JSON, it might be raw token string
    if (raw.trim()) return raw.trim();
  }

  return null;
}

export function getStoredAuthUser(): any | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.user ?? null;
  } catch {
    return null;
  }
}
