/**
 * Owner console (Owner Dashboard SRS release 1): /owner/* for Super Admins and platform staff,
 * plus two-step verification (/auth/mfa*). Every route checks an `owner.*` permission on the
 * server; the client uses the same list only to hide what the person cannot open.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export type InstitutionStatus = 'prospect' | 'trial' | 'active' | 'suspended' | 'expired' | 'closed';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'requires_information';
export type HealthStatus = 'ok' | 'warning' | 'down';

export interface PageMeta {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage?: number;
}

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  value: number | string | null;
}

export interface SystemHealthSnapshot {
  status: HealthStatus;
  checkedAt: string;
  checks: HealthCheck[];
}

export interface OwnerSummary {
  period: { from: string; to: string };
  institutions: { total: number; byStatus: Record<InstitutionStatus, number>; pendingVerification: number; newInPeriod: number };
  users: { total: number; byRole: Record<string, number>; studentRecords: number; activeInPeriod: number };
  ai: { calls: number; failures: number; tokens: number; estimatedCostUsd: number; note: string };
  system: SystemHealthSnapshot;
  generatedAt: string;
}

export interface TrendPoint {
  month: string;
  newInstitutions: number;
  totalInstitutions: number;
  newUsers: number;
  aiCalls: number;
  aiCostUsd: number;
}

export interface OwnerAlert {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  /** Owner console route, e.g. "institutions/4" or "system". */
  link: string | null;
}

export interface ActivityEntry {
  id: number;
  action: string;
  actor: string | null;
  actorRole: string | null;
  institution: string | null;
  subjectType: string | null;
  subjectId: number | null;
  at: string;
}

export interface InstitutionSummary {
  id: number;
  code: string;
  name: string;
  type: string | null;
  status: InstitutionStatus;
  verificationStatus: VerificationStatus;
  officialEmail: string | null;
  state: string | null;
  trialEndsAt: string | null;
  usersCount: number | null;
  studentsCount: number | null;
  createdAt: string | null;
}

export interface InstitutionDetail extends InstitutionSummary {
  registrationNumber: string | null;
  contactPhone: string | null;
  website: string | null;
  country: string | null;
  district: string | null;
  address: string | null;
  pincode: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  allowedTransitions: InstitutionStatus[];
  scheduledChange: { to: InstitutionStatus; effectiveAt: string | null; reason: string | null } | null;
  counts: { campuses: number; departments: number; students: number; staff: number; admins: number; users: number };
  admins: { id: number; name: string; email: string; status: string; lastLoginAt: string | null }[];
  aiUsage30d: { calls: number; estimatedCostUsd: number };
}

export interface InstitutionHistory {
  status: { id: number; kind: 'lifecycle' | 'verification'; from: string | null; to: string; reason: string | null; effectiveAt: string | null; applied: boolean; actor: string | null; at: string }[];
  audit: { id: number; action: string; actor: string | null; old: Record<string, unknown> | null; new: Record<string, unknown> | null; ip: string | null; at: string }[];
}

export interface InstitutionProfileInput {
  name: string;
  institutionType: string;
  registrationNumber?: string;
  officialEmail: string;
  contactPhone: string;
  website?: string;
  country: string;
  state: string;
  district?: string;
  address: string;
  pincode?: string;
}

export interface CreateInstitutionInput extends InstitutionProfileInput {
  code: string;
  status: 'prospect' | 'trial' | 'active';
  trialDays?: number;
  adminName: string;
  adminEmail: string;
}

export interface PlatformUserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  platformRole: { id: number; name: string } | null;
  isPlatform: boolean;
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  institutionId: number | null;
  institution: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface PlatformUserDetail extends PlatformUserSummary {
  statusReason: string | null;
  title: string | null;
  phone: string | null;
  emailVerified: boolean;
  lockedUntil: string | null;
  activeSessions: number;
  ownerPermissions: string[];
  recentLogins: { outcome: string; reason: string | null; ip: string | null; userAgent: string | null; at: string }[];
}

export interface PlatformRole {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  usersCount: number;
}

export interface PermissionGroup {
  module: string;
  permissions: { key: string; label: string }[];
}

export interface RoleChangePreview {
  added: string[];
  removed: string[];
  affectedUsers: { id: number; name: string; email: string }[];
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string | null;
  defaultTimezone: string;
  currency: string;
  dateFormat: string;
  defaultTrialDays: number;
  maxUploadMb: number;
  passwordMinLength: number;
  mfaRequiredForPlatformStaff: boolean;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  actor: { id: number; name: string; email: string; role: string } | null;
  institution: string | null;
  subjectType: string | null;
  subjectId: number | null;
  old: Record<string, unknown> | null;
  new: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  at: string;
}

export interface LoginEntry {
  id: number;
  email: string;
  userId: number | null;
  institution: string | null;
  outcome: 'success' | 'failed' | 'locked' | 'refused' | 'mfa_failed';
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  at: string;
}

export interface SessionEntry {
  id: number;
  device: string;
  user: { id: number; name: string; email: string; role: string } | null;
  institution: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  current: boolean;
}

export interface MfaStatus {
  enabled: boolean;
  enabledAt: string | null;
  required: boolean;
  available: boolean;
}

type Query = Record<string, string | number | boolean | null | undefined>;
type Page<T> = { data: T[]; meta: PageMeta };

export const ownerApi = {
  summary: () => http.get<{ data: OwnerSummary }>('/owner/dashboard/summary').then((r) => r.data),
  trends: () => http.get<{ data: TrendPoint[] }>('/owner/dashboard/trends').then((r) => r.data),
  alerts: () => http.get<{ data: OwnerAlert[] }>('/owner/dashboard/alerts').then((r) => r.data),
  activity: () => http.get<{ data: ActivityEntry[] }>('/owner/dashboard/activity').then((r) => r.data),

  institutions: (query: Query) => http.get<Page<InstitutionSummary>>('/owner/institutions', query),
  institution: (id: number) => http.get<{ data: InstitutionDetail }>(`/owner/institutions/${id}`).then((r) => r.data),
  institutionHistory: (id: number) => http.get<{ data: InstitutionHistory }>(`/owner/institutions/${id}/history`).then((r) => r.data),
  createInstitution: (input: CreateInstitutionInput) => http.post<{ data: InstitutionDetail }>('/owner/institutions', input).then((r) => r.data),
  updateInstitution: (id: number, input: Partial<InstitutionProfileInput>) => http.patch<{ data: InstitutionDetail }>(`/owner/institutions/${id}`, input).then((r) => r.data),
  verifyInstitution: (id: number, input: { status: VerificationStatus; note?: string }) =>
    http.post<{ data: InstitutionDetail }>(`/owner/institutions/${id}/verify`, input).then((r) => r.data),
  changeInstitutionStatus: (id: number, input: { status: InstitutionStatus; reason?: string; effectiveAt?: string }) =>
    http.post<{ data: InstitutionDetail; scheduled: boolean }>(`/owner/institutions/${id}/status`, input),

  users: (query: Query) => http.get<Page<PlatformUserSummary>>('/owner/users', query),
  user: (id: number) => http.get<{ data: PlatformUserDetail }>(`/owner/users/${id}`).then((r) => r.data),
  inviteUser: (input: { name: string; email: string; role: 'platform_staff' | 'super_admin'; platformRoleId?: number | null }) =>
    http.post<{ data: PlatformUserDetail }>('/owner/users/invitations', input).then((r) => r.data),
  setUserRole: (id: number, platformRoleId: number) => http.patch<{ data: PlatformUserDetail }>(`/owner/users/${id}`, { platformRoleId }).then((r) => r.data),
  changeUserStatus: (id: number, input: { status: 'active' | 'suspended'; reason?: string }) =>
    http.post<{ data: PlatformUserDetail }>(`/owner/users/${id}/status`, input).then((r) => r.data),
  sendPasswordReset: (id: number) => http.post<{ message: string }>(`/owner/users/${id}/password-reset`),
  revokeUserSessions: (id: number) => http.delete<{ message: string }>(`/owner/users/${id}/sessions`),

  permissions: () => http.get<{ data: PermissionGroup[] }>('/owner/permissions').then((r) => r.data),
  roles: () => http.get<{ data: PlatformRole[] }>('/owner/roles').then((r) => r.data),
  createRole: (input: { name: string; description?: string; permissions: string[] }) => http.post<{ data: PlatformRole }>('/owner/roles', input).then((r) => r.data),
  previewRole: (id: number, input: { permissions: string[] }) => http.patch<{ data: RoleChangePreview }>(`/owner/roles/${id}?preview=1`, input).then((r) => r.data),
  updateRole: (id: number, input: { name?: string; description?: string; permissions?: string[] }) =>
    http.patch<{ data: PlatformRole }>(`/owner/roles/${id}`, input).then((r) => r.data),
  deleteRole: (id: number) => http.delete<{ message: string }>(`/owner/roles/${id}`),

  settings: () => http.get<{ data: PlatformSettings }>('/owner/settings').then((r) => r.data),
  saveSettings: (input: Partial<PlatformSettings>) => http.put<{ data: PlatformSettings }>('/owner/settings', input).then((r) => r.data),
  auditLogs: (query: Query) => http.get<Page<AuditEntry>>('/owner/audit-logs', query),
  loginHistory: (query: Query) => http.get<Page<LoginEntry> & { summary: Record<string, number> }>('/owner/login-history', query),
  sessions: () => http.get<{ data: SessionEntry[] }>('/owner/sessions').then((r) => r.data),
  revokeSession: (id: number) => http.delete<{ message: string }>(`/owner/sessions/${id}`),
  health: () => http.get<{ data: SystemHealthSnapshot }>('/owner/system/health').then((r) => r.data),

  mfaStatus: () => http.get<{ data: MfaStatus }>('/auth/mfa').then((r) => r.data),
  mfaSetup: () => http.post<{ data: { secret: string; otpauthUri: string } }>('/auth/mfa/setup').then((r) => r.data),
  mfaConfirm: (code: string) => http.post<{ data: MfaStatus }>('/auth/mfa/confirm', { code }).then((r) => r.data),
  mfaDisable: (code: string) => http.post<{ data: MfaStatus }>('/auth/mfa/disable', { code }).then((r) => r.data),
};

export const ownerKeys = {
  all: ['owner'] as const,
  summary: ['owner', 'summary'] as const,
  trends: ['owner', 'trends'] as const,
  alerts: ['owner', 'alerts'] as const,
  activity: ['owner', 'activity'] as const,
  institutions: (query: Query) => ['owner', 'institutions', query] as const,
  institution: (id: number) => ['owner', 'institution', id] as const,
  institutionHistory: (id: number) => ['owner', 'institution', id, 'history'] as const,
  users: (query: Query) => ['owner', 'users', query] as const,
  user: (id: number) => ['owner', 'user', id] as const,
  permissions: ['owner', 'permissions'] as const,
  roles: ['owner', 'roles'] as const,
  settings: ['owner', 'settings'] as const,
  auditLogs: (query: Query) => ['owner', 'audit', query] as const,
  loginHistory: (query: Query) => ['owner', 'logins', query] as const,
  sessions: ['owner', 'sessions'] as const,
  health: ['owner', 'health'] as const,
  mfa: ['owner', 'mfa'] as const,
};

export const useOwnerSummary = () => useQuery({ queryKey: ownerKeys.summary, queryFn: ownerApi.summary, refetchInterval: 120_000 });
export const useOwnerTrends = () => useQuery({ queryKey: ownerKeys.trends, queryFn: ownerApi.trends });
export const useOwnerAlerts = () => useQuery({ queryKey: ownerKeys.alerts, queryFn: ownerApi.alerts, refetchInterval: 120_000 });
export const useOwnerActivity = () => useQuery({ queryKey: ownerKeys.activity, queryFn: ownerApi.activity });
export const useInstitutions = (query: Query) =>
  useQuery({ queryKey: ownerKeys.institutions(query), queryFn: () => ownerApi.institutions(query), placeholderData: (previous) => previous });
export const useInstitution = (id: number) => useQuery({ queryKey: ownerKeys.institution(id), queryFn: () => ownerApi.institution(id) });
export const useInstitutionHistory = (id: number) => useQuery({ queryKey: ownerKeys.institutionHistory(id), queryFn: () => ownerApi.institutionHistory(id) });
export const usePlatformUsers = (query: Query) =>
  useQuery({ queryKey: ownerKeys.users(query), queryFn: () => ownerApi.users(query), placeholderData: (previous) => previous });
export const usePlatformUser = (id: number) => useQuery({ queryKey: ownerKeys.user(id), queryFn: () => ownerApi.user(id) });
export const usePermissionCatalog = () => useQuery({ queryKey: ownerKeys.permissions, queryFn: ownerApi.permissions, staleTime: Infinity });
export const usePlatformRoles = (enabled = true) => useQuery({ queryKey: ownerKeys.roles, queryFn: ownerApi.roles, enabled });
export const usePlatformSettings = () => useQuery({ queryKey: ownerKeys.settings, queryFn: ownerApi.settings });
export const useAuditLogs = (query: Query) =>
  useQuery({ queryKey: ownerKeys.auditLogs(query), queryFn: () => ownerApi.auditLogs(query), placeholderData: (previous) => previous });
export const useLoginHistory = (query: Query) =>
  useQuery({ queryKey: ownerKeys.loginHistory(query), queryFn: () => ownerApi.loginHistory(query), placeholderData: (previous) => previous });
export const useSessions = () => useQuery({ queryKey: ownerKeys.sessions, queryFn: ownerApi.sessions });
export const useSystemHealth = () => useQuery({ queryKey: ownerKeys.health, queryFn: ownerApi.health, refetchInterval: 60_000 });
export const useMfaStatus = () => useQuery({ queryKey: ownerKeys.mfa, queryFn: ownerApi.mfaStatus });

/** A mutation that refreshes every owner query afterwards (counts, alerts and lists all move together). */
export function useOwnerMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: ownerKeys.all }) });
}

/** Mirrors App\Support\Owner\OwnerPermission. */
export const OWNER = {
  dashboard: 'owner.dashboard.view',
  institutionsView: 'owner.institutions.view',
  institutionsCreate: 'owner.institutions.create',
  institutionsEdit: 'owner.institutions.edit',
  institutionsVerify: 'owner.institutions.verify',
  institutionsSuspend: 'owner.institutions.suspend',
  institutionsExport: 'owner.institutions.export',
  usersView: 'owner.users.view',
  usersInvite: 'owner.users.invite',
  usersSuspend: 'owner.users.suspend',
  usersSessions: 'owner.users.sessions',
  rolesView: 'owner.roles.view',
  rolesManage: 'owner.roles.manage',
  settingsView: 'owner.settings.view',
  settingsManage: 'owner.settings.manage',
  auditView: 'owner.audit.view',
  securityView: 'owner.security.view',
  systemView: 'owner.system.view',
} as const;

export const institutionStatusLabels: Record<InstitutionStatus, string> = {
  prospect: 'Prospect',
  trial: 'Trial',
  active: 'Active',
  suspended: 'Suspended',
  expired: 'Expired',
  closed: 'Closed',
};

export const verificationLabels: Record<VerificationStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  requires_information: 'Needs information',
};

/** Statuses that need a reason (InstitutionLifecycle::REASON_REQUIRED). */
export const REASON_REQUIRED: InstitutionStatus[] = ['suspended', 'expired', 'closed'];
