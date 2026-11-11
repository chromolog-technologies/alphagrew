/**
 * Owner console (Owner Dashboard SRS release 1): /owner/* for Super Admins and platform staff,
 * plus two-step verification (/auth/mfa*). Every route checks an `owner.*` permission on the
 * server; the client uses the same list only to hide what the person cannot open.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, http, isApiConfigured } from './http';
import { ownerDemoApi } from './ownerDemoData';

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
  openIncidents?: number;
  openSecurityEvents?: number;
}

export interface OwnerSummary {
  period: { from: string; to: string };
  filterStatus?: string | null;
  defaultCurrency?: string;
  institutions: { total: number; byStatus: Record<InstitutionStatus, number>; pendingVerification: number; newInPeriod: number };
  users: { total: number; byRole: Record<string, number>; studentRecords: number; activeInPeriod: number };
  commercial?: {
    currency: string;
    mrr: number;
    arr: number;
    invoiced: number;
    collectedRevenue: number;
    outstandingBalance: number;
    subscriptions: { active: number; trial: number; pastDue: number; total: number; trialConversionRate: number; churnRate: number };
    planDistribution: { planId: number; planCode: string; planName: string; subscriptions: number; mrr: number }[];
  };
  ai: {
    calls: number;
    failures: number;
    tokens: number;
    estimatedCostUsd: number;
    creditsAllocated?: number;
    creditsConsumed?: number;
    creditsRemaining?: number;
    creditsUsedInPeriod?: number;
    note: string;
  };
  system: SystemHealthSnapshot;
  generatedAt: string;
}

export interface TrendPoint {
  month: string;
  newInstitutions: number;
  totalInstitutions: number;
  newUsers: number;
  revenueCollected?: number;
  aiCalls: number;
  aiCostUsd: number;
  aiCreditsUsed?: number;
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
  logoUrl?: string | null;
  settingsOverrides?: Record<string, unknown>;
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
  subscription?: {
    id: number;
    planCode: string | null;
    planName: string | null;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    amount: number;
    currency: string;
    renewalAt: string | null;
  } | null;
  aiCreditWallet?: {
    balance: number;
    allocatedTotal: number;
    consumedTotal: number;
  } | null;
}

export interface InstitutionHistory {
  status: { id: number; kind: 'lifecycle' | 'verification'; from: string | null; to: string; reason: string | null; effectiveAt: string | null; applied: boolean; actor: string | null; at: string }[];
  audit: { id: number; action: string; actor: string | null; old: Record<string, unknown> | null; new: Record<string, unknown> | null; ip: string | null; at: string }[];
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  modelType: string | null;
  modelId: number;
  actor: { id: number; name: string; email: string; role: string } | null;
  institution: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  at: string;
}

export type CollegeLogCategory = 'all' | 'audit' | 'activity' | 'login' | 'security' | 'status' | 'subscription' | 'ai';

export interface CollegeLogTimelineItem {
  id: string;
  category: Exclude<CollegeLogCategory, 'all'>;
  title: string;
  detail: string;
  statusOrSeverity: string;
  actor: string;
  ip: string | null;
  at: string;
  metadata: unknown;
}

export interface InstitutionLogsBundle {
  institution: { id: number; code: string; name: string; status: InstitutionStatus | string };
  counts: {
    audit: number;
    activity: number;
    login: number;
    security: number;
    status: number;
    subscription: number;
    ai: number;
    total: number;
  };
  timeline: CollegeLogTimelineItem[];
  audit: AuditEntry[];
  activity: ActivityLogEntry[];
  logins: LoginEntry[];
  security: SecurityEvent[];
  status: InstitutionHistory['status'];
  subscription: {
    id: number;
    subscriptionId: number;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    actor: string | null;
    at: string;
  }[];
  ai: {
    id: number;
    feature: string;
    provider: string;
    model: string;
    status: string;
    user: { id: number; name: string; email: string } | null;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    creditsCharged: number;
    estimatedCostUsd: number;
    error: string | null;
    at: string;
  }[];
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
  title?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
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
  brandTagline?: string | null;
  brandPrimaryColor?: string;
  supportEmail: string | null;
  supportPhone?: string | null;
  defaultTimezone: string;
  defaultLanguage?: string;
  currency: string;
  dateFormat: string;
  defaultTrialDays: number;
  maxUploadMb: number;
  passwordMinLength: number;
  sessionTimeoutMinutes?: number;
  mfaRequiredForPlatformStaff: boolean;
  billingDefaultTaxCode?: string | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceBypassIps?: string[];
}

export interface InstitutionSettingsResponse {
  overrides: Record<string, unknown>;
  allowedKeys: string[];
  defaults: Record<string, unknown>;
}

export interface SecurityEvent {
  id: number;
  severity: 'info' | 'warning' | 'high' | 'critical';
  eventType: string;
  institution: string | null;
  email: string | null;
  ip: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  status: 'open' | 'acknowledged' | 'resolved';
  resolvedBy: string | null;
  resolvedAt: string | null;
  at: string;
}

export interface SystemIncident {
  id: number;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mitigated' | 'resolved';
  component: string;
  summary: string;
  impact: string | null;
  assignee: { id: number; name: string } | null;
  creator: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string | null;
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

export type PlanStatus = 'draft' | 'active' | 'archived';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'void';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'executed';

export interface PlanVersion {
  id: number;
  versionNumber: number;
  billingCycle: BillingCycle;
  price: number;
  setupFee: number;
  currency: string;
  trialDays: number;
  studentLimit: number | null;
  facultyLimit: number | null;
  campusLimit: number | null;
  departmentLimit: number | null;
  recruiterLimit: number | null;
  storageLimitMb: number;
  apiRequestsLimit: number | null;
  aiCreditAllocation: number;
  aiCreditResetPeriod: 'monthly' | 'quarterly' | 'yearly' | 'none';
  features: Record<string, boolean>;
  isCurrent: boolean;
  publishedAt: string | null;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  sortOrder: number;
  isPublic: boolean;
  subscriptionsCount: number;
  activeSubscriptionsCount: number;
  currentVersion: PlanVersion | null;
  versions?: PlanVersion[];
  updatedAt: string | null;
}

export interface PlanInput {
  code?: string;
  name: string;
  description?: string;
  status?: PlanStatus;
  sortOrder?: number;
  isPublic?: boolean;
  billingCycle: BillingCycle;
  price: number;
  setupFee: number;
  currency: string;
  trialDays: number;
  studentLimit?: number | null;
  facultyLimit?: number | null;
  campusLimit?: number | null;
  departmentLimit?: number | null;
  recruiterLimit?: number | null;
  storageLimitMb: number;
  apiRequestsLimit?: number | null;
  aiCreditAllocation: number;
  aiCreditResetPeriod: 'monthly' | 'quarterly' | 'yearly' | 'none';
  features: Record<string, boolean>;
}

export interface SubscriptionEvent {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  actor: string | null;
  at: string;
}

export interface Subscription {
  id: number;
  institution: { id: number; name: string; code: string; status: string } | null;
  plan: { id: number; code: string; name: string } | null;
  planVersionId: number;
  planVersionNumber: number | null;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  mrr: number;
  startAt: string;
  endAt: string;
  trialStartAt: string | null;
  trialEndAt: string | null;
  renewalAt: string | null;
  graceEndsAt: string | null;
  graceDays: number;
  expiryBehavior: 'grace_then_readonly' | 'grace_then_suspend' | 'immediate_suspend';
  autoRenew: boolean;
  cancelReason: string | null;
  cancelledAt: string | null;
  pausedAt: string | null;
  entitlementSnapshot: {
    limits?: Record<string, number | string | null>;
    features?: Record<string, boolean>;
  } | null;
  events?: SubscriptionEvent[];
}

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  itemType?: 'subscription' | 'setup_fee' | 'ai_credits' | 'addon' | 'adjustment';
}

export interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string | null;
  institution: { id: number; name: string; code: string } | null;
  paymentReference: string | null;
  gateway: string;
  method: string;
  amount: number;
  refundedAmount: number;
  refundableAmount: number;
  currency: string;
  status: PaymentStatus;
  gatewayEventId: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

export interface Refund {
  id: number;
  paymentId: number;
  paymentReference: string | null;
  invoiceId: number;
  invoiceNumber: string | null;
  institution: { id: number; name: string; code: string } | null;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  gatewayRefundReference: string | null;
  requestedBy: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  createdAt: string | null;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  institution: { id: number; name: string; code: string } | null;
  subscriptionId: number | null;
  status: InvoiceStatus;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issuedAt: string | null;
  dueAt: string;
  subtotal: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  gstin: string | null;
  placeOfSupply: string | null;
  notes: string | null;
  items: InvoiceItem[];
  payments?: Payment[];
  refunds?: Refund[];
  createdAt: string | null;
}

export interface TaxProfile {
  id: number;
  code: string;
  name: string;
  taxType: 'gst' | 'vat' | 'sales_tax' | 'none';
  ratePercent: number;
  gstin: string | null;
  placeOfSupply: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  currency: string | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
}

export interface RevenueSummary {
  currency: string;
  period: { from: string; to: string };
  mrr: number;
  arr: number;
  invoiced: number;
  collected: number;
  refunded: number;
  outstanding: number;
  subscriptions: { active: number; trial: number; pastDue: number; total: number; trialConversionRate: number; churnRate: number };
  byPlan: { planId: number; planCode: string; planName: string; subscriptions: number; mrr: number }[];
  byInstitution: { institutionId: number; institutionName: string; code: string; invoiced: number; paid: number; outstanding: number }[];
}

export interface AiCreditWallet {
  id: number;
  institution: { id: number; name: string; code: string; status: string } | null;
  balance: number;
  allocatedTotal: number;
  consumedTotal: number;
  usedPercent: number;
  monthlyQuota: number | null;
  warningThresholdPercent: number;
  hardStopOnExhaustion: boolean;
  chargeFailedRequests: boolean;
  thresholdExceeded: boolean;
  lastActivityAt: string | null;
}

export interface AiCreditTransaction {
  id: number;
  type: string;
  creditsDelta: number;
  balanceAfter: number;
  reason: string | null;
  expiresAt: string | null;
  actor: string;
  at: string;
}

export interface AiUsageLogEntry {
  id: number;
  institution: { id: number; name: string; code: string } | null;
  user: { id: number; name: string } | null;
  feature: string;
  provider: string;
  model: string;
  status: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  creditsCharged: number | null;
  error: string | null;
  at: string;
}

export interface AiRateCard {
  id: number;
  serviceKey: string;
  provider: string;
  model: string;
  creditsPerRequest: number;
  creditsPer1kTokens: number;
  usdPer1kInputTokens: number;
  usdPer1kOutputTokens: number;
  rateLimitPerMinute: number | null;
  warningThresholdPercent: number;
  chargeOnFailure: boolean;
  isActive: boolean;
}

export interface AiProvidersResponse {
  providers: { key: string; name: string; configured: boolean; maskedKey: string | null; models: string[]; chain: string[]; timeoutSeconds: number | null }[];
  rateCards: AiRateCard[];
  services: string[];
}

export interface MfaStatus {
  enabled: boolean;
  enabledAt: string | null;
  required: boolean;
  available: boolean;
}

type Query = Record<string, string | number | boolean | null | undefined>;
type Page<T> = { data: T[]; meta: PageMeta };

const offlineMfaError = () =>
  Promise.reject(new ApiError('Two-factor setup requires a connected Laravel API.', 400));

export const ownerApi = {
  summary: (query: Query = {}) => (isApiConfigured() ? http.get<{ data: OwnerSummary }>('/owner/dashboard/summary', query).then((r) => r.data) : ownerDemoApi.summary(query)),
  trends: () => (isApiConfigured() ? http.get<{ data: TrendPoint[] }>('/owner/dashboard/trends').then((r) => r.data) : ownerDemoApi.trends()),
  alerts: () => (isApiConfigured() ? http.get<{ data: OwnerAlert[] }>('/owner/dashboard/alerts').then((r) => r.data) : ownerDemoApi.alerts()),
  activity: () => (isApiConfigured() ? http.get<{ data: ActivityEntry[] }>('/owner/dashboard/activity').then((r) => r.data) : ownerDemoApi.activity()),

  institutions: (query: Query) => (isApiConfigured() ? http.get<Page<InstitutionSummary>>('/owner/institutions', query) : ownerDemoApi.institutions(query)),
  institution: (id: number) => (isApiConfigured() ? http.get<{ data: InstitutionDetail }>(`/owner/institutions/${id}`).then((r) => r.data) : ownerDemoApi.institution(id)),
  institutionHistory: (id: number) =>
    isApiConfigured() ? http.get<{ data: InstitutionHistory }>(`/owner/institutions/${id}/history`).then((r) => r.data) : ownerDemoApi.institutionHistory(id),
  institutionLogs: (id: number, query: Query = {}) =>
    isApiConfigured() ? http.get<{ data: InstitutionLogsBundle }>(`/owner/institutions/${id}/logs`, query).then((r) => r.data) : ownerDemoApi.institutionLogs(id, query),
  createInstitution: (input: CreateInstitutionInput) =>
    isApiConfigured() ? http.post<{ data: InstitutionDetail }>('/owner/institutions', input).then((r) => r.data) : ownerDemoApi.createInstitution(input),
  updateInstitution: (id: number, input: Partial<InstitutionProfileInput>) =>
    isApiConfigured() ? http.patch<{ data: InstitutionDetail }>(`/owner/institutions/${id}`, input).then((r) => r.data) : ownerDemoApi.updateInstitution(id, input),
  verifyInstitution: (id: number, input: { status: VerificationStatus; note?: string }) =>
    isApiConfigured() ? http.post<{ data: InstitutionDetail }>(`/owner/institutions/${id}/verify`, input).then((r) => r.data) : ownerDemoApi.verifyInstitution(id, input),
  changeInstitutionStatus: (id: number, input: { status: InstitutionStatus; reason?: string; effectiveAt?: string }) =>
    isApiConfigured()
      ? http.post<{ data: InstitutionDetail; scheduled: boolean }>(`/owner/institutions/${id}/status`, input)
      : ownerDemoApi.changeInstitutionStatus(id, input),
  uploadInstitutionLogo: (id: number, file: File) => {
    if (!isApiConfigured()) return ownerDemoApi.uploadInstitutionLogo(id);
    const form = new FormData();
    form.append('logo', file);
    return http.post<{ data: InstitutionDetail }>(`/owner/institutions/${id}/logo`, form).then((r) => r.data);
  },
  deleteInstitutionLogo: (id: number) =>
    isApiConfigured() ? http.delete<{ data: InstitutionDetail }>(`/owner/institutions/${id}/logo`).then((r) => r.data) : ownerDemoApi.deleteInstitutionLogo(id),
  institutionSettings: (id: number) =>
    isApiConfigured() ? http.get<{ data: InstitutionSettingsResponse }>(`/owner/institutions/${id}/settings`).then((r) => r.data) : ownerDemoApi.institutionSettings(id),
  saveInstitutionSettings: (id: number, input: Record<string, unknown>) =>
    isApiConfigured() ? http.put<{ data: InstitutionSettingsResponse }>(`/owner/institutions/${id}/settings`, input).then((r) => r.data) : ownerDemoApi.saveInstitutionSettings(id, input),

  users: (query: Query) => (isApiConfigured() ? http.get<Page<PlatformUserSummary>>('/owner/users', query) : ownerDemoApi.users(query)),
  user: (id: number) => (isApiConfigured() ? http.get<{ data: PlatformUserDetail }>(`/owner/users/${id}`).then((r) => r.data) : ownerDemoApi.user(id)),
  inviteUser: (input: { name: string; email: string; role: 'platform_staff' | 'super_admin'; platformRoleId?: number | null }) =>
    isApiConfigured() ? http.post<{ data: PlatformUserDetail }>('/owner/users/invitations', input).then((r) => r.data) : ownerDemoApi.inviteUser(input),
  setUserRole: (id: number, platformRoleId: number) => http.patch<{ data: PlatformUserDetail }>(`/owner/users/${id}`, { platformRoleId }).then((r) => r.data),
  changeUserStatus: (id: number, input: { status: 'active' | 'suspended'; reason?: string }) =>
    isApiConfigured() ? http.post<{ data: PlatformUserDetail }>(`/owner/users/${id}/status`, input).then((r) => r.data) : ownerDemoApi.changeUserStatus(id, input),
  sendPasswordReset: (id: number) =>
    isApiConfigured() ? http.post<{ message: string }>(`/owner/users/${id}/password-reset`) : ownerDemoApi.sendPasswordReset(),
  resendUserInvite: (id: number) =>
    isApiConfigured() ? http.post<{ message: string }>(`/owner/users/${id}/resend-invite`) : ownerDemoApi.sendPasswordReset(),
  revokeUserSessions: (id: number) =>
    isApiConfigured() ? http.delete<{ message: string }>(`/owner/users/${id}/sessions`) : ownerDemoApi.revokeUserSessions(id),

  permissions: () => http.get<{ data: PermissionGroup[] }>('/owner/permissions').then((r) => r.data),
  roles: () => http.get<{ data: PlatformRole[] }>('/owner/roles').then((r) => r.data),
  createRole: (input: { name: string; description?: string; permissions: string[] }) => http.post<{ data: PlatformRole }>('/owner/roles', input).then((r) => r.data),
  previewRole: (id: number, input: { permissions: string[] }) => http.patch<{ data: RoleChangePreview }>(`/owner/roles/${id}?preview=1`, input).then((r) => r.data),
  updateRole: (id: number, input: { name?: string; description?: string; permissions?: string[] }) =>
    http.patch<{ data: PlatformRole }>(`/owner/roles/${id}`, input).then((r) => r.data),
  deleteRole: (id: number) => http.delete<{ message: string }>(`/owner/roles/${id}`),

  settings: () => (isApiConfigured() ? http.get<{ data: PlatformSettings }>('/owner/settings').then((r) => r.data) : ownerDemoApi.settings()),
  saveSettings: (input: Partial<PlatformSettings>) =>
    isApiConfigured() ? http.put<{ data: PlatformSettings }>('/owner/settings', input).then((r) => r.data) : ownerDemoApi.saveSettings(input),
  auditLogs: (query: Query) => (isApiConfigured() ? http.get<Page<AuditEntry>>('/owner/audit-logs', query) : ownerDemoApi.auditLogs(query)),
  activityLogs: (query: Query) => (isApiConfigured() ? http.get<Page<ActivityLogEntry>>('/owner/activity-logs', query) : ownerDemoApi.activityLogs(query)),
  loginHistory: (query: Query) =>
    isApiConfigured() ? http.get<Page<LoginEntry> & { summary: Record<string, number> }>('/owner/login-history', query) : ownerDemoApi.loginHistory(query),
  securityEvents: (query: Query = {}) =>
    isApiConfigured() ? http.get<Page<SecurityEvent>>('/owner/security-events', query) : ownerDemoApi.securityEvents(query),
  updateSecurityEvent: (id: number, status: SecurityEvent['status']) =>
    isApiConfigured() ? http.patch<{ data: { id: number; status: SecurityEvent['status'] } }>(`/owner/security-events/${id}`, { status }).then((r) => r.data) : ownerDemoApi.updateSecurityEvent(id, status),
  sessions: (query: Query = {}) => (isApiConfigured() ? http.get<{ data: SessionEntry[] }>('/owner/sessions', query).then((r) => r.data) : ownerDemoApi.sessions(query)),
  revokeSession: (id: number) => (isApiConfigured() ? http.delete<{ message: string }>(`/owner/sessions/${id}`) : ownerDemoApi.revokeSession(id)),
  health: () => (isApiConfigured() ? http.get<{ data: SystemHealthSnapshot }>('/owner/system/health').then((r) => r.data) : ownerDemoApi.health()),
  incidents: (query: Query = {}) =>
    isApiConfigured() ? http.get<{ data: SystemIncident[] }>('/owner/system/incidents', query).then((r) => r.data) : ownerDemoApi.incidents(query),
  createIncident: (input: { title: string; severity: SystemIncident['severity']; component: string; summary: string; impact?: string }) =>
    isApiConfigured() ? http.post<{ data: { id: number; status: string } }>('/owner/system/incidents', input).then((r) => r.data) : ownerDemoApi.createIncident(input),
  updateIncident: (id: number, input: { status?: SystemIncident['status']; severity?: SystemIncident['severity']; resolutionNote?: string }) =>
    isApiConfigured() ? http.patch<{ data: { id: number; status: string } }>(`/owner/system/incidents/${id}`, input).then((r) => r.data) : ownerDemoApi.updateIncident(id, input),

  mfaStatus: () => (isApiConfigured() ? http.get<{ data: MfaStatus }>('/auth/mfa').then((r) => r.data) : ownerDemoApi.mfaStatus()),
  mfaSetup: () => (isApiConfigured() ? http.post<{ data: { secret: string; otpauthUri: string } }>('/auth/mfa/setup').then((r) => r.data) : offlineMfaError()),
  mfaConfirm: (code: string) => (isApiConfigured() ? http.post<{ data: MfaStatus }>('/auth/mfa/confirm', { code }).then((r) => r.data) : offlineMfaError()),
  mfaDisable: (code: string) => (isApiConfigured() ? http.post<{ data: MfaStatus }>('/auth/mfa/disable', { code }).then((r) => r.data) : offlineMfaError()),

  // Release 2: Plans & Entitlements
  plans: (query: Query = {}) => (isApiConfigured() ? http.get<{ data: Plan[] }>('/owner/plans', query).then((r) => r.data) : ownerDemoApi.plans(query)),
  plan: (id: number) => (isApiConfigured() ? http.get<{ data: Plan }>(`/owner/plans/${id}`).then((r) => r.data) : ownerDemoApi.plan(id)),
  createPlan: (input: PlanInput) => (isApiConfigured() ? http.post<{ data: Plan }>('/owner/plans', input).then((r) => r.data) : ownerDemoApi.createPlan(input)),
  updatePlan: (id: number, input: Partial<PlanInput>) =>
    isApiConfigured() ? http.patch<{ data: Plan }>(`/owner/plans/${id}`, input).then((r) => r.data) : ownerDemoApi.updatePlan(id, input),
  clonePlan: (id: number, input: { code?: string; name?: string } = {}) =>
    isApiConfigured() ? http.post<{ data: Plan }>(`/owner/plans/${id}/clone`, input).then((r) => r.data) : ownerDemoApi.clonePlan(id, input),
  publishPlan: (id: number) => (isApiConfigured() ? http.post<{ data: Plan }>(`/owner/plans/${id}/publish`).then((r) => r.data) : ownerDemoApi.publishPlan(id)),
  archivePlan: (id: number) => (isApiConfigured() ? http.post<{ data: Plan }>(`/owner/plans/${id}/archive`).then((r) => r.data) : ownerDemoApi.archivePlan(id)),
  deletePlan: (id: number) => (isApiConfigured() ? http.delete<{ message: string }>(`/owner/plans/${id}`) : ownerDemoApi.deletePlan(id)),

  // Release 2: Subscriptions & Trials
  subscriptions: (query: Query = {}) =>
    isApiConfigured() ? http.get<Page<Subscription>>('/owner/subscriptions', query) : ownerDemoApi.subscriptions(query),
  subscription: (id: number) =>
    isApiConfigured() ? http.get<{ data: Subscription }>(`/owner/subscriptions/${id}`).then((r) => r.data) : ownerDemoApi.subscription(id),
  assignSubscription: (input: {
    institutionId: number;
    planId: number;
    status?: 'trial' | 'active';
    billingCycle?: BillingCycle;
    amount?: number;
    currency?: string;
    startAt?: string;
    trialDays?: number;
    graceDays?: number;
    expiryBehavior?: 'grace_then_readonly' | 'grace_then_suspend' | 'immediate_suspend';
    autoRenew?: boolean;
    generateInvoice?: boolean;
  }) => (isApiConfigured() ? http.post<{ data: Subscription }>('/owner/subscriptions', input).then((r) => r.data) : ownerDemoApi.assignSubscription(input)),
  changeSubscriptionPlan: (id: number, input: { planId: number; reason?: string; generateInvoice?: boolean }) =>
    isApiConfigured()
      ? http.post<{ data: Subscription }>(`/owner/subscriptions/${id}/change-plan`, input).then((r) => r.data)
      : ownerDemoApi.changeSubscriptionPlan(id, input),
  renewSubscription: (id: number, generateInvoice = true) =>
    isApiConfigured()
      ? http.post<{ data: Subscription }>(`/owner/subscriptions/${id}/renew`, { generateInvoice }).then((r) => r.data)
      : ownerDemoApi.renewSubscription(id, generateInvoice),
  pauseSubscription: (id: number, reason: string) =>
    isApiConfigured() ? http.post<{ data: Subscription }>(`/owner/subscriptions/${id}/pause`, { reason }).then((r) => r.data) : ownerDemoApi.pauseSubscription(id, reason),
  resumeSubscription: (id: number) =>
    isApiConfigured() ? http.post<{ data: Subscription }>(`/owner/subscriptions/${id}/resume`).then((r) => r.data) : ownerDemoApi.resumeSubscription(id),
  extendSubscription: (id: number, input: { days: number; reason: string }) =>
    isApiConfigured() ? http.post<{ data: Subscription }>(`/owner/subscriptions/${id}/extend`, input).then((r) => r.data) : ownerDemoApi.extendSubscription(id, input),
  cancelSubscription: (id: number, input: { reason: string; immediate?: boolean }) =>
    isApiConfigured() ? http.post<{ data: Subscription }>(`/owner/subscriptions/${id}/cancel`, input).then((r) => r.data) : ownerDemoApi.cancelSubscription(id, input),

  // Release 2: Billing, Invoices, Payments, Refunds, Tax & Coupons
  invoices: (query: Query = {}) => (isApiConfigured() ? http.get<Page<Invoice>>('/owner/invoices', query) : ownerDemoApi.invoices(query)),
  invoice: (id: number) => (isApiConfigured() ? http.get<{ data: Invoice }>(`/owner/invoices/${id}`).then((r) => r.data) : ownerDemoApi.invoice(id)),
  createInvoice: (input: {
    institutionId: number;
    subscriptionId?: number | null;
    taxProfileId?: number | null;
    couponCode?: string;
    currency?: string;
    dueAt?: string;
    notes?: string;
    issueImmediately?: boolean;
    items: InvoiceItem[];
  }) => (isApiConfigured() ? http.post<{ data: Invoice }>('/owner/invoices', input).then((r) => r.data) : ownerDemoApi.createInvoice(input)),
  issueInvoice: (id: number) =>
    isApiConfigured() ? http.post<{ data: Invoice }>(`/owner/invoices/${id}/issue`).then((r) => r.data) : ownerDemoApi.issueInvoice(id),
  voidInvoice: (id: number, reason?: string) =>
    isApiConfigured() ? http.post<{ data: Invoice }>(`/owner/invoices/${id}/void`, { reason }).then((r) => r.data) : ownerDemoApi.voidInvoice(id),
  payments: (query: Query = {}) => (isApiConfigured() ? http.get<Page<Payment>>('/owner/payments', query) : ownerDemoApi.payments(query)),
  recordPayment: (input: {
    invoiceId: number;
    amount?: number;
    gateway?: string;
    method?: string;
    status?: 'pending' | 'succeeded' | 'failed';
    paymentReference?: string;
    gatewayEventId?: string;
  }) => (isApiConfigured() ? http.post<{ data: Payment; duplicate: boolean }>('/owner/payments', input) : ownerDemoApi.recordPayment(input)),
  refunds: (query: Query = {}) => (isApiConfigured() ? http.get<Page<Refund>>('/owner/refunds', query) : ownerDemoApi.refunds(query)),
  requestRefund: (input: { paymentId: number; amount: number; reason: string }) =>
    isApiConfigured() ? http.post<{ data: Refund }>('/owner/refunds', input).then((r) => r.data) : ownerDemoApi.requestRefund(input),
  approveRefund: (id: number) =>
    isApiConfigured() ? http.post<{ data: Refund }>(`/owner/refunds/${id}/approve`).then((r) => r.data) : ownerDemoApi.approveRefund(id),
  rejectRefund: (id: number, reason: string) =>
    isApiConfigured() ? http.post<{ data: Refund }>(`/owner/refunds/${id}/reject`, { reason }).then((r) => r.data) : ownerDemoApi.rejectRefund(id, reason),
  executeRefund: (id: number) =>
    isApiConfigured() ? http.post<{ data: Refund }>(`/owner/refunds/${id}/execute`).then((r) => r.data) : ownerDemoApi.executeRefund(id),
  revenueSummary: () =>
    isApiConfigured() ? http.get<{ data: RevenueSummary }>('/owner/revenue/summary').then((r) => r.data) : ownerDemoApi.revenueSummary(),
  taxProfiles: () => (isApiConfigured() ? http.get<{ data: TaxProfile[] }>('/owner/tax-profiles').then((r) => r.data) : ownerDemoApi.taxProfiles()),
  createTaxProfile: (input: { code: string; name: string; taxType: string; ratePercent: number; gstin?: string; placeOfSupply?: string; isDefault?: boolean }) =>
    isApiConfigured() ? http.post<{ data: TaxProfile }>('/owner/tax-profiles', input).then((r) => r.data) : ownerDemoApi.createTaxProfile(input),
  updateTaxProfile: (id: number, input: { isActive?: boolean; isDefault?: boolean }) =>
    isApiConfigured() ? http.patch<{ data: TaxProfile }>(`/owner/tax-profiles/${id}`, input).then((r) => r.data) : ownerDemoApi.updateTaxProfile(id, input),
  coupons: () => (isApiConfigured() ? http.get<{ data: Coupon[] }>('/owner/coupons').then((r) => r.data) : ownerDemoApi.coupons()),
  createCoupon: (input: { code: string; name: string; discountType: 'percent' | 'fixed'; discountValue: number; currency?: string; maxRedemptions?: number | null }) =>
    isApiConfigured() ? http.post<{ data: Coupon }>('/owner/coupons', input).then((r) => r.data) : ownerDemoApi.createCoupon(input),
  updateCoupon: (id: number, input: { isActive?: boolean; maxRedemptions?: number | null }) =>
    isApiConfigured() ? http.patch<{ data: Coupon }>(`/owner/coupons/${id}`, input).then((r) => r.data) : ownerDemoApi.updateCoupon(id, input),

  // Release 2: AI Usage, Credit Wallets, Ledger & Providers
  aiUsage: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<Page<AiUsageLogEntry> & { summary: { calls: number; failures: number; tokens: number; estimatedCostUsd: number; creditsCharged: number } }>('/owner/ai/usage', query)
      : ownerDemoApi.aiUsage(query),
  aiCredits: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: AiCreditWallet[]; summary: { allocated: number; consumed: number; remaining: number } }>('/owner/ai/credits', query)
      : ownerDemoApi.aiCredits(query),
  aiCreditLedger: (institutionId: number) =>
    isApiConfigured()
      ? http.get<Page<AiCreditTransaction> & { wallet: AiCreditWallet }>(`/owner/ai/credits/${institutionId}/ledger`)
      : ownerDemoApi.aiCreditLedger(institutionId),
  adjustAiCredits: (input: { institutionId: number; transactionType: string; creditsDelta: number; reason: string; expiresAt?: string }) =>
    isApiConfigured()
      ? http.post<{ data: { transactionId: number; wallet: AiCreditWallet } }>('/owner/ai/credits/adjustments', input).then((r) => r.data)
      : ownerDemoApi.adjustAiCredits(input),
  updateAiWalletPolicy: (institutionId: number, input: { monthlyQuota?: number | null; warningThresholdPercent?: number; hardStopOnExhaustion?: boolean; chargeFailedRequests?: boolean }) =>
    isApiConfigured()
      ? http.patch<{ data: AiCreditWallet }>(`/owner/ai/credits/${institutionId}/policy`, input).then((r) => r.data)
      : ownerDemoApi.updateAiWalletPolicy(institutionId, input),
  aiProviders: () =>
    isApiConfigured() ? http.get<{ data: AiProvidersResponse }>('/owner/ai/providers').then((r) => r.data) : ownerDemoApi.aiProviders(),
  saveAiRateCard: (input: {
    serviceKey: string;
    provider: string;
    model: string;
    creditsPerRequest: number;
    creditsPer1kTokens?: number;
    usdPer1kInputTokens?: number;
    usdPer1kOutputTokens?: number;
    rateLimitPerMinute?: number | null;
    warningThresholdPercent?: number;
    chargeOnFailure?: boolean;
  }) =>
    isApiConfigured() ? http.post<{ data: AiRateCard }>('/owner/ai/rate-cards', input).then((r) => r.data) : ownerDemoApi.saveAiRateCard(input),
  updateAiRateCard: (id: number, input: { isActive?: boolean; creditsPerRequest?: number; creditsPer1kTokens?: number }) =>
    isApiConfigured() ? http.patch<{ data: AiRateCard }>(`/owner/ai/rate-cards/${id}`, input).then((r) => r.data) : ownerDemoApi.updateAiRateCard(id, input),
};

export const ownerKeys = {
  all: ['owner'] as const,
  summary: (query: Query = {}) => ['owner', 'summary', query] as const,
  trends: ['owner', 'trends'] as const,
  alerts: ['owner', 'alerts'] as const,
  activity: ['owner', 'activity'] as const,
  institutions: (query: Query) => ['owner', 'institutions', query] as const,
  institution: (id: number) => ['owner', 'institution', id] as const,
  institutionHistory: (id: number) => ['owner', 'institution', id, 'history'] as const,
  institutionLogs: (id: number, query: Query = {}) => ['owner', 'institution', id, 'logs', query] as const,
  institutionSettings: (id: number) => ['owner', 'institution', id, 'settings'] as const,
  users: (query: Query) => ['owner', 'users', query] as const,
  user: (id: number) => ['owner', 'user', id] as const,
  permissions: ['owner', 'permissions'] as const,
  roles: ['owner', 'roles'] as const,
  settings: ['owner', 'settings'] as const,
  auditLogs: (query: Query) => ['owner', 'audit', query] as const,
  activityLogs: (query: Query) => ['owner', 'activityLogs', query] as const,
  loginHistory: (query: Query) => ['owner', 'logins', query] as const,
  securityEvents: (query: Query) => ['owner', 'securityEvents', query] as const,
  sessions: (query: Query = {}) => ['owner', 'sessions', query] as const,
  health: ['owner', 'health'] as const,
  incidents: (query: Query) => ['owner', 'incidents', query] as const,
  mfa: ['owner', 'mfa'] as const,
  plans: (query: Query) => ['owner', 'plans', query] as const,
  plan: (id: number) => ['owner', 'plan', id] as const,
  subscriptions: (query: Query) => ['owner', 'subscriptions', query] as const,
  subscription: (id: number) => ['owner', 'subscription', id] as const,
  invoices: (query: Query) => ['owner', 'invoices', query] as const,
  invoice: (id: number) => ['owner', 'invoice', id] as const,
  payments: (query: Query) => ['owner', 'payments', query] as const,
  refunds: (query: Query) => ['owner', 'refunds', query] as const,
  revenue: ['owner', 'revenue'] as const,
  taxProfiles: ['owner', 'taxProfiles'] as const,
  coupons: ['owner', 'coupons'] as const,
  aiUsage: (query: Query) => ['owner', 'aiUsage', query] as const,
  aiCredits: (query: Query) => ['owner', 'aiCredits', query] as const,
  aiLedger: (institutionId: number) => ['owner', 'aiLedger', institutionId] as const,
  aiProviders: ['owner', 'aiProviders'] as const,
};

export const useOwnerSummary = (query: Query = {}) => useQuery({ queryKey: ownerKeys.summary(query), queryFn: () => ownerApi.summary(query), refetchInterval: 120_000 });
export const useOwnerTrends = () => useQuery({ queryKey: ownerKeys.trends, queryFn: ownerApi.trends });
export const useOwnerAlerts = () => useQuery({ queryKey: ownerKeys.alerts, queryFn: ownerApi.alerts, refetchInterval: 120_000 });
export const useOwnerActivity = () => useQuery({ queryKey: ownerKeys.activity, queryFn: ownerApi.activity });
export const useInstitutions = (query: Query) =>
  useQuery({ queryKey: ownerKeys.institutions(query), queryFn: () => ownerApi.institutions(query), placeholderData: (previous) => previous });
export const useInstitution = (id: number) => useQuery({ queryKey: ownerKeys.institution(id), queryFn: () => ownerApi.institution(id) });
export const useInstitutionHistory = (id: number) => useQuery({ queryKey: ownerKeys.institutionHistory(id), queryFn: () => ownerApi.institutionHistory(id) });
export const useInstitutionLogs = (id: number, query: Query = {}, enabled = true) =>
  useQuery({
    queryKey: ownerKeys.institutionLogs(id, query),
    queryFn: () => ownerApi.institutionLogs(id, query),
    enabled: enabled && id > 0,
    placeholderData: (previous) => previous,
  });
export const useInstitutionSettings = (id: number) => useQuery({ queryKey: ownerKeys.institutionSettings(id), queryFn: () => ownerApi.institutionSettings(id) });
export const usePlatformUsers = (query: Query) =>
  useQuery({ queryKey: ownerKeys.users(query), queryFn: () => ownerApi.users(query), placeholderData: (previous) => previous });
export const usePlatformUser = (id: number) => useQuery({ queryKey: ownerKeys.user(id), queryFn: () => ownerApi.user(id) });
export const usePermissionCatalog = () => useQuery({ queryKey: ownerKeys.permissions, queryFn: ownerApi.permissions, staleTime: Infinity });
export const usePlatformRoles = (enabled = true) => useQuery({ queryKey: ownerKeys.roles, queryFn: ownerApi.roles, enabled });
export const usePlatformSettings = () => useQuery({ queryKey: ownerKeys.settings, queryFn: ownerApi.settings });
export const useAuditLogs = (query: Query) =>
  useQuery({ queryKey: ownerKeys.auditLogs(query), queryFn: () => ownerApi.auditLogs(query), placeholderData: (previous) => previous });
export const useActivityLogs = (query: Query) =>
  useQuery({ queryKey: ownerKeys.activityLogs(query), queryFn: () => ownerApi.activityLogs(query), placeholderData: (previous) => previous });
export const useLoginHistory = (query: Query) =>
  useQuery({ queryKey: ownerKeys.loginHistory(query), queryFn: () => ownerApi.loginHistory(query), placeholderData: (previous) => previous });
export const useSecurityEvents = (query: Query = {}) => useQuery({ queryKey: ownerKeys.securityEvents(query), queryFn: () => ownerApi.securityEvents(query) });
export const useSessions = (query: Query = {}) => useQuery({ queryKey: ownerKeys.sessions(query), queryFn: () => ownerApi.sessions(query) });
export const useSystemHealth = () => useQuery({ queryKey: ownerKeys.health, queryFn: ownerApi.health, refetchInterval: 60_000 });
export const useSystemIncidents = (query: Query = {}) => useQuery({ queryKey: ownerKeys.incidents(query), queryFn: () => ownerApi.incidents(query) });
export const useMfaStatus = () => useQuery({ queryKey: ownerKeys.mfa, queryFn: ownerApi.mfaStatus });

export const usePlans = (query: Query = {}) => useQuery({ queryKey: ownerKeys.plans(query), queryFn: () => ownerApi.plans(query) });
export const usePlan = (id: number | null) => useQuery({ queryKey: ownerKeys.plan(id ?? 0), queryFn: () => ownerApi.plan(id!), enabled: Boolean(id) });
export const useSubscriptions = (query: Query = {}) =>
  useQuery({ queryKey: ownerKeys.subscriptions(query), queryFn: () => ownerApi.subscriptions(query), placeholderData: (p) => p });
export const useSubscription = (id: number) => useQuery({ queryKey: ownerKeys.subscription(id), queryFn: () => ownerApi.subscription(id) });
export const useInvoices = (query: Query = {}) =>
  useQuery({ queryKey: ownerKeys.invoices(query), queryFn: () => ownerApi.invoices(query), placeholderData: (p) => p });
export const useInvoiceDetail = (id: number | null) =>
  useQuery({ queryKey: ownerKeys.invoice(id ?? 0), queryFn: () => ownerApi.invoice(id!), enabled: Boolean(id) });
export const usePayments = (query: Query = {}) =>
  useQuery({ queryKey: ownerKeys.payments(query), queryFn: () => ownerApi.payments(query), placeholderData: (p) => p });
export const useRefunds = (query: Query = {}) =>
  useQuery({ queryKey: ownerKeys.refunds(query), queryFn: () => ownerApi.refunds(query), placeholderData: (p) => p });
export const useRevenueSummary = () => useQuery({ queryKey: ownerKeys.revenue, queryFn: ownerApi.revenueSummary });
export const useTaxProfiles = () => useQuery({ queryKey: ownerKeys.taxProfiles, queryFn: ownerApi.taxProfiles });
export const useCoupons = () => useQuery({ queryKey: ownerKeys.coupons, queryFn: ownerApi.coupons });
export const useAiUsage = (query: Query = {}) =>
  useQuery({ queryKey: ownerKeys.aiUsage(query), queryFn: () => ownerApi.aiUsage(query), placeholderData: (p) => p });
export const useAiCredits = (query: Query = {}) => useQuery({ queryKey: ownerKeys.aiCredits(query), queryFn: () => ownerApi.aiCredits(query) });
export const useAiCreditLedger = (institutionId: number | null) =>
  useQuery({ queryKey: ownerKeys.aiLedger(institutionId ?? 0), queryFn: () => ownerApi.aiCreditLedger(institutionId!), enabled: Boolean(institutionId) });
export const useAiProviders = () => useQuery({ queryKey: ownerKeys.aiProviders, queryFn: ownerApi.aiProviders });

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
  plansView: 'owner.plans.view',
  plansManage: 'owner.plans.manage',
  subscriptionsView: 'owner.subscriptions.view',
  subscriptionsManage: 'owner.subscriptions.manage',
  billingView: 'owner.billing.view',
  billingManage: 'owner.billing.manage',
  billingRefund: 'owner.billing.refund',
  aiView: 'owner.ai.view',
  aiManage: 'owner.ai.manage',
  aiCredits: 'owner.ai.credits',
  oversightView: 'owner.oversight.view',
  reportsView: 'owner.reports.view',
  reportsExport: 'owner.reports.export',
  onboardingView: 'owner.onboarding.view',
  onboardingManage: 'owner.onboarding.manage',
  crmView: 'owner.crm.view',
  crmManage: 'owner.crm.manage',
  supportView: 'owner.support.view',
  supportManage: 'owner.support.manage',
  integrationsView: 'owner.integrations.view',
  integrationsManage: 'owner.integrations.manage',
  dataView: 'owner.data.view',
  dataManage: 'owner.data.manage',
  communicationsView: 'owner.communications.view',
  communicationsManage: 'owner.communications.manage',
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
