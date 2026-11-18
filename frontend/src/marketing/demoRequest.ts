import { http, isApiConfigured } from '../api/http';
import { isApiError } from '../api/apiError';
import { trackGoal } from './analytics';

/** What the public forms send to POST /demo-requests (saved as an Owner Console CRM lead). */
export interface DemoRequestPayload {
  name: string;
  email: string;
  institution?: string;
  phone?: string;
  role?: string;
  size?: string;
  interests?: string[];
  message?: string;
  form: 'demo' | 'get_in_touch';
  /** Honeypot: hidden from people, left empty. */
  website?: string;
}

/**
 * Whether the forms can save straight to the sales pipeline. Same test as isApiConfigured(),
 * but read on each call so tests can stub VITE_API_BASE_URL.
 */
export const canSubmitOnline = () => isApiConfigured() && Boolean((import.meta.env.VITE_API_BASE_URL ?? '').trim());

export async function submitDemoRequest(payload: DemoRequestPayload): Promise<void> {
  await http.public.post<{ message: string }>('/demo-requests', payload);
  trackGoal('Demo request', { form: payload.form });
}

/** Turns a failed submission into field errors (422) or one message for the whole form. */
export function describeSubmitError(error: unknown): { fields: Record<string, string>; message?: string } {
  if (isApiError(error)) {
    if (error.status === 422) return { fields: error.firstFieldErrors };
    if (error.status === 429) return { fields: {}, message: 'You have sent several requests in a short time. Wait a minute and try again.' };
  }
  return { fields: {}, message: 'We could not send your request just now.' };
}
