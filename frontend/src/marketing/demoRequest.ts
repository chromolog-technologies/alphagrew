import { track } from '@vercel/analytics';
import { isApiError } from '../api/apiError';
import { apiFetch, isApiConfigured } from '../api/core';
import { BRAND } from './config';

// Demo requests, shared by the Contact page form and the home page "Get in touch" form.
// They post to POST /demo-requests, which saves an Owner Console lead and emails the team.

export const DEMO_ROLES = ['Principal or director', 'Training and placement officer', 'Head of department', 'Faculty or trainer', 'Recruiter', 'Student', 'Other'] as const;
export const DEMO_SIZES = ['Under 500', '500 to 2,000', '2,000 to 5,000', 'Over 5,000'] as const;

export interface DemoRequest {
  name: string;
  email: string;
  institution: string;
  role: string;
  phone: string;
  size: string;
  interests: string[];
  message: string;
}

export type DemoRequestErrors = Partial<Record<'name' | 'email' | 'institution', string>>;

export const REQUIRED_DEMO_FIELDS = ['name', 'institution', 'email'] as const;

export function validateDemoRequest(request: DemoRequest): DemoRequestErrors {
  const errors: DemoRequestErrors = {};
  if (!request.name.trim()) errors.name = 'Enter your name.';
  if (!request.institution.trim()) errors.institution = 'Enter your institution or company.';
  if (!request.email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim())) errors.email = 'Enter an email address like name@college.edu.in.';
  return errors;
}

/** Builds a mailto: link so the request is sent from the visitor's own email app (builds without the API). */
export function demoRequestMailto(to: string, request: DemoRequest) {
  const lines = [
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Institution or company: ${request.institution}`,
    `Role: ${request.role}`,
    request.phone && `Phone: ${request.phone}`,
    request.size && `Final and pre-final year students: ${request.size}`,
    request.interests.length > 0 && `Interested in: ${request.interests.join(', ')}`,
    request.message && `\n${request.message}`,
  ].filter(Boolean);
  const subject = `${BRAND} demo request: ${request.institution}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export const canSendDemoRequestsOnline = () => isApiConfigured();

export interface SendResult {
  ok: boolean;
  fieldErrors: DemoRequestErrors;
  message: string;
}

/** Sends the request. `website` is the honeypot value (always empty for people). */
export async function sendDemoRequest(request: DemoRequest, website: string, source: 'contact' | 'home' = 'contact'): Promise<SendResult> {
  try {
    await apiFetch('/demo-requests', { method: 'POST', token: null, body: { ...request, website } });
    // Conversion event for Vercel Web Analytics; no personal details are sent.
    track('Demo request', { source, role: request.role });
    return { ok: true, fieldErrors: {}, message: '' };
  } catch (error) {
    if (isApiError(error) && error.status === 422) {
      const fields = error.firstFieldErrors;
      return { ok: false, fieldErrors: { name: fields.name, email: fields.email, institution: fields.institution }, message: error.message };
    }
    const message = isApiError(error) && error.status === 429 ? error.message : 'Your request could not be sent.';
    return { ok: false, fieldErrors: {}, message };
  }
}
