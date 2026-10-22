/**
 * Account and onboarding API (Slice 1): password reset, email verification, invitations,
 * registration approval, sessions and the audit log.
 */

import { http, type Paginated } from './http';
import type { AuthResponse } from './campusApi';

export { ApiError, type Paginated } from './http';

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

// Public pages
export const forgotPassword = (email: string) =>
  http.public.post<{ message: string }>('/auth/forgot-password', { email });

export const resetPassword = (payload: { token: string; email: string; password: string; password_confirmation: string }) =>
  http.public.post<{ message: string }>('/auth/reset-password', payload);

export const registerStudent = (payload: { name: string; email: string; password: string; institutionCode: string; departmentCode: string }) =>
  http.public.post<{ message: string }>('/auth/register', payload);

export const fetchInvitation = (token: string) =>
  http.public.get<{ data: InvitationPreview }>(`/invitations/accept/${encodeURIComponent(token)}`);

export const acceptInvitation = (token: string, payload: { name: string; password: string; password_confirmation: string }) =>
  http.public.post<AuthResponse>(`/invitations/accept/${encodeURIComponent(token)}`, payload);

// Signed-in user
export const resendVerificationEmail = () => http.post<{ message: string }>('/auth/email/verification-notification');

export const fetchSessions = () => http.get<{ data: SessionInfo[] }>('/auth/sessions');

export const revokeSession = (id: number) => http.delete<{ message: string }>(`/auth/sessions/${id}`);

export const revokeOtherSessions = () => http.delete<{ message: string; revoked: number }>('/auth/sessions');

// Admin
export const fetchInvitations = (params: { status?: InvitationStatus | ''; search?: string; page?: number }) =>
  http.get<Paginated<Invitation>>('/invitations', { ...params, per_page: 25 });

export const createInvitations = (payload: { emails: string[]; role: InvitableRole; departmentCode: string; designationId?: number | null }): Promise<{
  data: Invitation[];
  skipped: { email: string; reason: string }[];
  message: string;
}> => http.post('/invitations', payload);

export const resendInvitation = (id: number) => http.post<{ data: Invitation }>(`/invitations/${id}/resend`);

export const revokeInvitation = (id: number) => http.delete<{ data: Invitation }>(`/invitations/${id}`);

export const fetchRegistrations = (params: { status?: 'pending_approval' | 'rejected'; page?: number }) =>
  http.get<Paginated<PendingRegistration>>('/registrations', { ...params, per_page: 25 });

export const approveRegistration = (id: number) => http.post<{ data: PendingRegistration }>(`/registrations/${id}/approve`);

export const rejectRegistration = (id: number, reason: string) =>
  http.post<{ data: PendingRegistration }>(`/registrations/${id}/reject`, { reason });

export const fetchAuditLogs = (params: { action?: string; from?: string; to?: string; page?: number }) =>
  http.get<Paginated<AuditLogEntry>>('/audit-logs', { ...params, per_page: 50 });
