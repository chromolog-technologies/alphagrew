/**
 * Account and onboarding API (Slice 1): password reset, email verification, invitations,
 * registration approval, sessions and the audit log.
 */

import { apiCall } from './apiClient';
import type { AuthResponse } from './campusApi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

/** An API error with Laravel's field errors (422), so forms can show them next to fields. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

/** Requests that don't need a signed-in user. */
async function publicRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('Campus API is not configured.', 0);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (response.headers.get('content-type') ?? '').includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      typeof payload?.message === 'string' ? payload.message : `Request failed (${response.status}).`,
      response.status,
      payload?.errors ?? {},
    );
  }

  return payload as T;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export type InvitableRole = 'student' | 'staff' | 'placement_officer';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation {
  id: number;
  email: string;
  role: InvitableRole;
  departmentCode: string | null;
  designationId: number | null;
  designationName?: string | null;
  status: InvitationStatus;
  invitedBy?: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface InvitationPreview {
  email: string;
  role: InvitableRole;
  departmentCode: string | null;
  institutionName: string | null;
  status: InvitationStatus;
  expiresAt: string;
}

export interface PendingRegistration {
  id: number;
  name: string;
  email: string;
  departmentCode: string | null;
  studentId: number | null;
  registrationNumber: string | null;
  status: 'pending_approval' | 'rejected' | 'active';
  statusReason: string | null;
  emailVerified: boolean;
  registeredAt: string;
}

export interface SessionInfo {
  id: number;
  device: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  current: boolean;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  actorId: number | null;
  actorName?: string | null;
  subjectType: string | null;
  subjectId: number | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const query = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

// Public pages
export const forgotPassword = (email: string) =>
  publicRequest<{ message: string }>('/auth/forgot-password', 'POST', { email });

export const resetPassword = (payload: { token: string; email: string; password: string; password_confirmation: string }) =>
  publicRequest<{ message: string }>('/auth/reset-password', 'POST', payload);

export const registerStudent = (payload: { name: string; email: string; password: string; institutionCode: string; departmentCode: string }) =>
  publicRequest<{ message: string }>('/auth/register', 'POST', payload);

export const fetchInvitation = (token: string) =>
  publicRequest<{ data: InvitationPreview }>(`/invitations/accept/${encodeURIComponent(token)}`, 'GET');

export const acceptInvitation = (token: string, payload: { name: string; password: string; password_confirmation: string }) =>
  publicRequest<AuthResponse>(`/invitations/accept/${encodeURIComponent(token)}`, 'POST', payload);

// Signed-in user
export const resendVerificationEmail = (): Promise<{ message: string }> => apiCall('/auth/email/verification-notification', 'POST', {});

export const fetchSessions = (): Promise<{ data: SessionInfo[] }> => apiCall('/auth/sessions');

export const revokeSession = (id: number): Promise<{ message: string }> => apiCall(`/auth/sessions/${id}`, 'DELETE');

export const revokeOtherSessions = (): Promise<{ message: string; revoked: number }> => apiCall('/auth/sessions', 'DELETE');

// Admin
export const fetchInvitations = (params: { status?: InvitationStatus | ''; search?: string; page?: number }): Promise<Paginated<Invitation>> =>
  apiCall(`/invitations${query({ ...params, per_page: 25 })}`);

export const createInvitations = (payload: { emails: string[]; role: InvitableRole; departmentCode: string; designationId?: number | null }): Promise<{
  data: Invitation[];
  skipped: { email: string; reason: string }[];
  message: string;
}> => apiCall('/invitations', 'POST', payload);

export const resendInvitation = (id: number): Promise<{ data: Invitation }> => apiCall(`/invitations/${id}/resend`, 'POST', {});

export const revokeInvitation = (id: number): Promise<{ data: Invitation }> => apiCall(`/invitations/${id}`, 'DELETE');

export const fetchRegistrations = (params: { status?: 'pending_approval' | 'rejected'; page?: number }): Promise<Paginated<PendingRegistration>> =>
  apiCall(`/registrations${query({ ...params, per_page: 25 })}`);

export const approveRegistration = (id: number): Promise<{ data: PendingRegistration }> => apiCall(`/registrations/${id}/approve`, 'POST', {});

export const rejectRegistration = (id: number, reason: string): Promise<{ data: PendingRegistration }> =>
  apiCall(`/registrations/${id}/reject`, 'POST', { reason });

export const fetchAuditLogs = (params: { action?: string; from?: string; to?: string; page?: number }): Promise<Paginated<AuditLogEntry>> =>
  apiCall(`/audit-logs${query({ ...params, per_page: 50 })}`);
