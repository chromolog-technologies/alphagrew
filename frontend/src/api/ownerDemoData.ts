/**
 * Offline demo store used by ownerApi only when VITE_API_BASE_URL is unset.
 * Allows exercising the single-owner Owner Console UI without a running backend.
 */
import { ApiError } from './http';
import type {
  ActivityEntry,
  ActivityLogEntry,
  AiCreditTransaction,
  AiCreditWallet,
  AiProvidersResponse,
  AiRateCard,
  AiUsageLogEntry,
  AuditEntry,
  CollegeLogCategory,
  CollegeLogTimelineItem,
  Coupon,
  CreateInstitutionInput,
  InstitutionDetail,
  InstitutionHistory,
  InstitutionLogsBundle,
  InstitutionProfileInput,
  InstitutionSettingsResponse,
  InstitutionStatus,
  Invoice,
  InvoiceItem,
  LoginEntry,
  MfaStatus,
  OwnerAlert,
  OwnerSummary,
  PageMeta,
  Payment,
  Plan,
  PlanInput,
  PlatformSettings,
  PlatformUserDetail,
  PlatformUserSummary,
  Refund,
  RevenueSummary,
  SecurityEvent,
  SessionEntry,
  Subscription,
  SystemHealthSnapshot,
  SystemIncident,
  TaxProfile,
  TrendPoint,
  VerificationStatus,
} from './ownerApi';

type Query = Record<string, string | number | boolean | null | undefined>;

const ALLOWED_TRANSITIONS: Record<InstitutionStatus, InstitutionStatus[]> = {
  prospect: ['trial', 'active', 'closed'],
  trial: ['active', 'suspended', 'expired', 'closed'],
  active: ['suspended', 'closed'],
  suspended: ['active', 'closed'],
  expired: ['trial', 'active', 'closed'],
  closed: ['active'],
};

const institutions: InstitutionDetail[] = [
  {
    id: 1,
    code: 'DEFAULT',
    name: 'Brightnode Institute of Technology',
    type: 'college',
    status: 'active',
    verificationStatus: 'verified',
    officialEmail: 'office@brightnode.edu',
    state: 'Tamil Nadu',
    trialEndsAt: null,
    usersCount: 42,
    studentsCount: 420,
    createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    registrationNumber: 'AICTE-1-0042',
    contactPhone: '+91 44 2345 6789',
    website: 'https://brightnode.example.edu',
    country: 'India',
    district: 'Chennai',
    address: '12 Anna Salai, Chennai',
    pincode: '600002',
    suspendedAt: null,
    suspensionReason: null,
    allowedTransitions: ALLOWED_TRANSITIONS.active,
    scheduledChange: null,
    counts: { campuses: 1, departments: 4, students: 420, staff: 38, admins: 2, users: 42 },
    admins: [{ id: 1, name: 'Dr. Anand Narayanan', email: 'admin@demo.com', status: 'active', lastLoginAt: new Date(Date.now() - 3_600_000).toISOString() }],
    aiUsage30d: { calls: 1280, estimatedCostUsd: 4.82 },
  },
  {
    id: 2,
    code: 'RIVERSIDE',
    name: 'Riverside Institute of Technology',
    type: 'institute',
    status: 'trial',
    verificationStatus: 'verified',
    officialEmail: 'admin@riverside.example.edu',
    state: 'Karnataka',
    trialEndsAt: new Date(Date.now() + 9 * 86_400_000).toISOString(),
    usersCount: 14,
    studentsCount: 110,
    createdAt: new Date(Date.now() - 21 * 86_400_000).toISOString(),
    registrationNumber: 'AICTE-2-0199',
    contactPhone: '+91 80 4123 9876',
    website: null,
    country: 'India',
    district: 'Bengaluru Urban',
    address: '4th Cross, Whitefield, Bengaluru',
    pincode: '560066',
    suspendedAt: null,
    suspensionReason: null,
    allowedTransitions: ALLOWED_TRANSITIONS.trial,
    scheduledChange: null,
    counts: { campuses: 1, departments: 3, students: 110, staff: 12, admins: 1, users: 14 },
    admins: [{ id: 12, name: 'Meera Kulkarni', email: 'riverside.admin@demo.com', status: 'active', lastLoginAt: new Date(Date.now() - 86_400_000).toISOString() }],
    aiUsage30d: { calls: 215, estimatedCostUsd: 0.74 },
  },
  {
    id: 3,
    code: 'NORTHFIELD',
    name: 'Northfield University',
    type: 'university',
    status: 'prospect',
    verificationStatus: 'pending',
    officialEmail: 'registrar@northfield.example.edu',
    state: 'Delhi',
    trialEndsAt: null,
    usersCount: 1,
    studentsCount: 0,
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    registrationNumber: null,
    contactPhone: '+91 11 4567 0000',
    website: null,
    country: 'India',
    district: 'New Delhi',
    address: 'Ring Road, New Delhi',
    pincode: '110001',
    suspendedAt: null,
    suspensionReason: null,
    allowedTransitions: ALLOWED_TRANSITIONS.prospect,
    scheduledChange: null,
    counts: { campuses: 1, departments: 0, students: 0, staff: 0, admins: 1, users: 1 },
    admins: [{ id: 15, name: 'Registrar Office', email: 'registrar@northfield.example.edu', status: 'pending', lastLoginAt: null }],
    aiUsage30d: { calls: 0, estimatedCostUsd: 0 },
  },
];

const users: PlatformUserDetail[] = [
  {
    id: 900,
    name: 'Platform Owner',
    email: 'owner@demo.com',
    role: 'super_admin',
    roleLabel: 'Platform Owner',
    platformRole: null,
    isPlatform: true,
    status: 'active',
    institutionId: null,
    institution: null,
    mfaEnabled: false,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    statusReason: null,
    title: 'Platform Owner',
    phone: null,
    emailVerified: true,
    lockedUntil: null,
    activeSessions: 1,
    ownerPermissions: ['owner.*'],
    recentLogins: [{ outcome: 'success', reason: null, ip: '127.0.0.1', userAgent: 'Offline Demo Browser', at: new Date().toISOString() }],
  },
  {
    id: 1,
    name: 'Dr. Anand Narayanan',
    email: 'admin@demo.com',
    role: 'institution_admin',
    roleLabel: 'Institution Admin',
    platformRole: null,
    isPlatform: false,
    status: 'active',
    institutionId: 1,
    institution: 'Brightnode Institute of Technology',
    mfaEnabled: false,
    lastLoginAt: new Date(Date.now() - 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    statusReason: null,
    title: 'Principal',
    phone: '+91 44 2345 6789',
    emailVerified: true,
    lockedUntil: null,
    activeSessions: 2,
    ownerPermissions: [],
    recentLogins: [{ outcome: 'success', reason: null, ip: '203.0.113.12', userAgent: 'Mozilla/5.0', at: new Date(Date.now() - 3_600_000).toISOString() }],
  },
];

let settings: PlatformSettings = {
  platformName: 'Alpha Grew',
  brandTagline: 'Unified Campus & Career Intelligence Platform',
  brandPrimaryColor: '#1557e0',
  supportEmail: 'support@alphagrew.example',
  supportPhone: '+91-80-4000-2200',
  defaultTimezone: 'Asia/Kolkata',
  defaultLanguage: 'en',
  currency: 'INR',
  dateFormat: 'DD MMM YYYY',
  defaultTrialDays: 30,
  maxUploadMb: 10,
  passwordMinLength: 8,
  sessionTimeoutMinutes: 120,
  mfaRequiredForPlatformStaff: false,
  billingDefaultTaxCode: 'GST18',
  maintenanceEnabled: false,
  maintenanceMessage: 'Scheduled maintenance is in progress. Please check back shortly.',
  maintenanceBypassIps: ['127.0.0.1'],
};

const demoInstitutionOverrides: Record<number, Record<string, unknown>> = {
  1: { defaultLanguage: 'en', maxUploadMb: 20 },
};

const demoSecurityEvents: SecurityEvent[] = [
  {
    id: 1,
    severity: 'warning',
    eventType: 'brute_force_detected',
    institution: 'Riverside Institute of Technology',
    email: 'admin@riverside.edu',
    ip: '198.51.100.44',
    summary: '5 consecutive failed login attempts within 4 minutes.',
    metadata: { attempts: 5 },
    status: 'open',
    resolvedBy: null,
    resolvedAt: null,
    at: new Date(Date.now() - 2_400_000).toISOString(),
  },
];

const demoIncidents: SystemIncident[] = [
  {
    id: 1,
    title: 'Delayed AI interview transcription webhook',
    severity: 'medium',
    status: 'mitigated',
    component: 'ai_gateway',
    summary: 'Elevated latency on Anthropic fallback route during peak placement hour.',
    impact: 'Mock interview feedback delayed by ~8 seconds.',
    assignee: { id: 900, name: 'Platform Owner' },
    creator: 'Platform Owner',
    acknowledgedAt: new Date(Date.now() - 7_200_000).toISOString(),
    resolvedAt: null,
    resolutionNote: 'Switched traffic weight to primary endpoint.',
    createdAt: new Date(Date.now() - 10_800_000).toISOString(),
  },
];

const auditEntries: AuditEntry[] = [
  {
    id: 1,
    action: 'owner.institution_created',
    actor: { id: 900, name: 'Platform Owner', email: 'owner@demo.com', role: 'super_admin' },
    institution: 'Riverside Institute of Technology',
    subjectType: 'Institution',
    subjectId: 2,
    old: null,
    new: { status: 'trial' },
    ip: '127.0.0.1',
    userAgent: 'Demo Mode',
    at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
];

const loginEntries: LoginEntry[] = [
  { id: 1, email: 'owner@demo.com', userId: 900, institution: null, outcome: 'success', reason: null, ip: '127.0.0.1', userAgent: 'Demo Mode', at: new Date().toISOString() },
  { id: 2, email: 'admin@demo.com', userId: 1, institution: 'Brightnode Institute of Technology', outcome: 'success', reason: null, ip: '203.0.113.12', userAgent: 'Mozilla/5.0', at: new Date(Date.now() - 1800_000).toISOString() },
];

let activeSessions: SessionEntry[] = [
  {
    id: 1,
    device: 'Offline Demo Browser',
    user: { id: 900, name: 'Platform Owner', email: 'owner@demo.com', role: 'super_admin' },
    institution: null,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    expiresAt: null,
    current: true,
  },
];

function paginate<T>(items: T[], query: Query): { data: T[]; meta: PageMeta } {
  const page = Number(query.page ?? 1) || 1;
  const perPage = Number(query.perPage ?? 25) || 25;
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    meta: { currentPage: page, lastPage: Math.max(1, Math.ceil(items.length / perPage)), total: items.length, perPage },
  };
}

let demoPlans: Plan[] = [
  {
    id: 1,
    code: 'STARTER',
    name: 'Campus Starter',
    description: 'Core academic, attendance and placement workflows.',
    status: 'active',
    sortOrder: 1,
    isPublic: true,
    subscriptionsCount: 1,
    activeSubscriptionsCount: 1,
    updatedAt: new Date().toISOString(),
    currentVersion: {
      id: 1,
      versionNumber: 1,
      billingCycle: 'monthly',
      price: 14999,
      setupFee: 0,
      currency: 'INR',
      trialDays: 14,
      studentLimit: 1000,
      facultyLimit: 100,
      campusLimit: 1,
      departmentLimit: 10,
      recruiterLimit: 25,
      storageLimitMb: 10240,
      apiRequestsLimit: 50000,
      aiCreditAllocation: 2500,
      aiCreditResetPeriod: 'monthly',
      features: { placement: true, assessments: true, resume_ai: true, ai_interviews: false, analytics: true, api_access: false, custom_branding: false },
      isCurrent: true,
      publishedAt: new Date().toISOString(),
    },
  },
  {
    id: 2,
    code: 'GROWTH',
    name: 'Career Intelligence Growth',
    description: 'Full AI interviews, resume intelligence and custom dashboards.',
    status: 'active',
    sortOrder: 2,
    isPublic: true,
    subscriptionsCount: 1,
    activeSubscriptionsCount: 1,
    updatedAt: new Date().toISOString(),
    currentVersion: {
      id: 2,
      versionNumber: 1,
      billingCycle: 'monthly',
      price: 39999,
      setupFee: 5000,
      currency: 'INR',
      trialDays: 30,
      studentLimit: 5000,
      facultyLimit: 400,
      campusLimit: 5,
      departmentLimit: 30,
      recruiterLimit: 150,
      storageLimitMb: 51200,
      apiRequestsLimit: 250000,
      aiCreditAllocation: 12000,
      aiCreditResetPeriod: 'monthly',
      features: { placement: true, assessments: true, resume_ai: true, ai_interviews: true, analytics: true, api_access: true, custom_branding: true },
      isCurrent: true,
      publishedAt: new Date().toISOString(),
    },
  },
];

let demoSubscriptions: Subscription[] = [
  {
    id: 1,
    institution: { id: 1, name: 'Brightnode Institute of Technology', code: 'DEFAULT', status: 'active' },
    plan: { id: 2, code: 'GROWTH', name: 'Career Intelligence Growth' },
    planVersionId: 2,
    planVersionNumber: 1,
    status: 'active',
    billingCycle: 'monthly',
    amount: 39999,
    currency: 'INR',
    mrr: 39999,
    startAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    endAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    trialStartAt: null,
    trialEndAt: null,
    renewalAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    graceEndsAt: null,
    graceDays: 7,
    expiryBehavior: 'grace_then_readonly',
    autoRenew: true,
    cancelReason: null,
    cancelledAt: null,
    pausedAt: null,
    entitlementSnapshot: { limits: { students: 5000, aiCredits: 12000 }, features: { ai_interviews: true, resume_ai: true, placement: true } },
    events: [{ id: 1, eventType: 'created', fromStatus: null, toStatus: 'active', reason: 'Subscription assigned', actor: 'Platform Owner', at: new Date(Date.now() - 20 * 86_400_000).toISOString() }],
  },
];

const demoInvoices: Invoice[] = [
  {
    id: 1,
    invoiceNumber: 'INV-202611-0001',
    institution: { id: 1, name: 'Brightnode Institute of Technology', code: 'DEFAULT' },
    subscriptionId: 1,
    status: 'paid',
    currency: 'INR',
    billingPeriodStart: new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10),
    billingPeriodEnd: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
    issuedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    dueAt: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10),
    subtotal: 44999,
    discountAmount: 0,
    taxRatePercent: 18,
    taxAmount: 8099.82,
    total: 53098.82,
    paidAmount: 53098.82,
    balance: 0,
    gstin: '29AABCC1234D1Z5',
    placeOfSupply: 'Tamil Nadu',
    notes: null,
    items: [
      { id: 1, description: 'Career Intelligence Growth (monthly) subscription', quantity: 1, unitPrice: 39999, amount: 39999, itemType: 'subscription' },
      { id: 2, description: 'Setup fee', quantity: 1, unitPrice: 5000, amount: 5000, itemType: 'setup_fee' },
    ],
    createdAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
  },
];

const demoPayments: Payment[] = [
  {
    id: 1,
    invoiceId: 1,
    invoiceNumber: 'INV-202611-0001',
    institution: { id: 1, name: 'Brightnode Institute of Technology', code: 'DEFAULT' },
    paymentReference: 'PAY-DEMO0001',
    gateway: 'razorpay',
    method: 'upi_emandate',
    amount: 53098.82,
    refundedAmount: 0,
    refundableAmount: 53098.82,
    currency: 'INR',
    status: 'succeeded',
    gatewayEventId: 'evt_demo_1',
    failureReason: null,
    paidAt: new Date(Date.now() - 19 * 86_400_000).toISOString(),
    createdAt: new Date(Date.now() - 19 * 86_400_000).toISOString(),
  },
];

const demoRefunds: Refund[] = [];

const demoTaxProfiles: TaxProfile[] = [
  { id: 1, code: 'GST-18', name: 'India GST 18%', taxType: 'gst', ratePercent: 18, gstin: '29AABCC1234D1Z5', placeOfSupply: 'Karnataka', isDefault: true, isActive: true },
];

const demoCoupons: Coupon[] = [
  { id: 1, code: 'LAUNCH20', name: 'Launch Partner 20% Off', discountType: 'percent', discountValue: 20, currency: null, maxRedemptions: 100, redemptionsCount: 0, validFrom: null, validUntil: null, isActive: true },
];

const demoWallets: AiCreditWallet[] = [
  { id: 1, institution: { id: 1, name: 'Brightnode Institute of Technology', code: 'DEFAULT', status: 'active' }, balance: 11250, allocatedTotal: 12000, consumedTotal: 750, usedPercent: 6.3, monthlyQuota: 15000, warningThresholdPercent: 80, hardStopOnExhaustion: false, chargeFailedRequests: false, thresholdExceeded: false, lastActivityAt: new Date().toISOString() },
  { id: 2, institution: { id: 2, name: 'Riverside Institute of Technology', code: 'RIVERSIDE', status: 'trial' }, balance: 2350, allocatedTotal: 2500, consumedTotal: 150, usedPercent: 6.0, monthlyQuota: null, warningThresholdPercent: 80, hardStopOnExhaustion: false, chargeFailedRequests: false, thresholdExceeded: false, lastActivityAt: new Date().toISOString() },
];

const demoLedger: Record<number, AiCreditTransaction[]> = {
  1: [{ id: 1, type: 'plan_allocation', creditsDelta: 12000, balanceAfter: 12000, reason: 'Initial Growth plan allocation', expiresAt: null, actor: 'Platform Owner', at: new Date(Date.now() - 20 * 86_400_000).toISOString() }],
  2: [{ id: 2, type: 'plan_allocation', creditsDelta: 2500, balanceAfter: 2500, reason: 'Starter trial allocation', expiresAt: null, actor: 'Platform Owner', at: new Date(Date.now() - 21 * 86_400_000).toISOString() }],
};

const demoRateCards: AiRateCard[] = [
  { id: 1, serviceKey: 'resume_analysis', provider: 'anthropic', model: 'claude-opus-5-5', creditsPerRequest: 4, creditsPer1kTokens: 1, usdPer1kInputTokens: 0.004, usdPer1kOutputTokens: 0.02, rateLimitPerMinute: 30, warningThresholdPercent: 80, chargeOnFailure: false, isActive: true },
  { id: 2, serviceKey: 'interview_turn', provider: 'anthropic', model: 'claude-opus-5-5', creditsPerRequest: 1.5, creditsPer1kTokens: 0.5, usdPer1kInputTokens: 0.004, usdPer1kOutputTokens: 0.02, rateLimitPerMinute: 60, warningThresholdPercent: 80, chargeOnFailure: false, isActive: true },
];

const demoAiLogs: AiUsageLogEntry[] = [
  { id: 1, institution: { id: 1, name: 'Brightnode Institute of Technology', code: 'DEFAULT' }, user: { id: 2, name: 'Aarav Nair' }, feature: 'interview_turn', provider: 'anthropic', model: 'claude-opus-5-5', status: 'success', promptTokens: 820, completionTokens: 190, latencyMs: 740, estimatedCostUsd: 0.0071, creditsCharged: 2, error: null, at: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 2, institution: { id: 2, name: 'Riverside Institute of Technology', code: 'RIVERSIDE' }, user: { id: 12, name: 'Meera Kulkarni' }, feature: 'resume_analysis', provider: 'anthropic', model: 'claude-opus-5-5', status: 'success', promptTokens: 540, completionTokens: 160, latencyMs: 520, estimatedCostUsd: 0.0054, creditsCharged: 4, error: null, at: new Date(Date.now() - 5_400_000).toISOString() },
];

const demoActivityLogs: ActivityLogEntry[] = [
  {
    id: 1,
    action: 'updated',
    modelType: 'Institution',
    modelId: 2,
    actor: { id: 12, name: 'Meera Kulkarni', email: 'riverside.admin@demo.com', role: 'institution_admin' },
    institution: 'Riverside Institute of Technology',
    changes: { old: { placement_policy: 'manual' }, new: { placement_policy: 'verified_only' } },
    ip: '198.51.100.22',
    userAgent: 'Mozilla/5.0',
    at: new Date(Date.now() - 7_200_000).toISOString(),
  },
  {
    id: 2,
    action: 'created',
    modelType: 'Student',
    modelId: 108,
    actor: { id: 1, name: 'Dr. Anand Narayanan', email: 'admin@demo.com', role: 'institution_admin' },
    institution: 'Brightnode Institute of Technology',
    changes: { new: { department: 'CSE', batch: '2027' } },
    ip: '198.51.100.10',
    userAgent: 'Mozilla/5.0',
    at: new Date(Date.now() - 10_800_000).toISOString(),
  },
];

export const ownerDemoApi = {
  summary: async (query: Query = {}): Promise<OwnerSummary> => ({
    period: { from: new Date(Date.now() - 30 * 86_400_000).toISOString(), to: new Date().toISOString() },
    filterStatus: query.status ? String(query.status) : null,
    defaultCurrency: settings.currency,
    institutions: {
      total: institutions.length,
      byStatus: {
        prospect: institutions.filter((i) => i.status === 'prospect').length,
        trial: institutions.filter((i) => i.status === 'trial').length,
        active: institutions.filter((i) => i.status === 'active').length,
        suspended: institutions.filter((i) => i.status === 'suspended').length,
        expired: institutions.filter((i) => i.status === 'expired').length,
        closed: institutions.filter((i) => i.status === 'closed').length,
      },
      pendingVerification: institutions.filter((i) => i.verificationStatus === 'pending').length,
      newInPeriod: institutions.length,
    },
    users: {
      total: users.length,
      byRole: { super_admin: users.filter((u) => u.isPlatform).length, institution_admin: users.filter((u) => !u.isPlatform).length },
      studentRecords: institutions.reduce((sum, item) => sum + (item.studentsCount ?? 0), 0),
      activeInPeriod: users.length,
    },
    commercial: {
      currency: settings.currency,
      mrr: demoSubscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
      arr: demoSubscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0) * 12,
      invoiced: demoInvoices.reduce((sum, i) => sum + i.total, 0),
      collectedRevenue: demoPayments.filter((p) => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0),
      outstandingBalance: demoInvoices.reduce((sum, i) => sum + i.balance, 0),
      subscriptions: {
        active: demoSubscriptions.filter((s) => s.status === 'active').length,
        trial: demoSubscriptions.filter((s) => s.status === 'trial').length,
        pastDue: demoSubscriptions.filter((s) => s.status === 'past_due').length,
        total: demoSubscriptions.length,
        trialConversionRate: 50,
        churnRate: 0,
      },
      planDistribution: demoPlans.map((p) => ({
        planId: p.id,
        planCode: p.code,
        planName: p.name,
        subscriptions: demoSubscriptions.filter((s) => s.plan?.id === p.id && s.status === 'active').length,
        mrr: demoSubscriptions.filter((s) => s.plan?.id === p.id && s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
      })),
    },
    ai: {
      calls: 1495,
      failures: 3,
      tokens: 845_000,
      estimatedCostUsd: 5.56,
      creditsAllocated: demoWallets.reduce((s, w) => s + w.allocatedTotal, 0),
      creditsConsumed: demoWallets.reduce((s, w) => s + w.consumedTotal, 0),
      creditsRemaining: demoWallets.reduce((s, w) => s + w.balance, 0),
      creditsUsedInPeriod: 900,
      note: 'Demo estimate (offline mode)',
    },
    system: await ownerDemoApi.health(),
    generatedAt: new Date().toISOString(),
  }),

  trends: async (): Promise<TrendPoint[]> => [
    { month: '2026-08', newInstitutions: 1, totalInstitutions: 1, newUsers: 22, revenueCollected: 29999, aiCalls: 640, aiCostUsd: 2.15, aiCreditsUsed: 410 },
    { month: '2026-09', newInstitutions: 1, totalInstitutions: 2, newUsers: 19, revenueCollected: 39999, aiCalls: 980, aiCostUsd: 3.45, aiCreditsUsed: 620 },
    { month: '2026-10', newInstitutions: 1, totalInstitutions: 3, newUsers: 16, revenueCollected: 53098.82, aiCalls: 1495, aiCostUsd: 5.56, aiCreditsUsed: 900 },
  ],

  alerts: async (): Promise<OwnerAlert[]> => [
    { severity: 'warning', type: 'trial_expiring', message: 'Riverside Institute of Technology trial ends in 9 days.', link: 'institutions/2' },
    { severity: 'info', type: 'verification_pending', message: 'Northfield University is awaiting verification.', link: 'institutions/3' },
  ],

  activity: async (): Promise<ActivityEntry[]> =>
    auditEntries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actor: entry.actor?.name ?? null,
      actorRole: entry.actor?.role ?? null,
      institution: entry.institution,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      at: entry.at,
    })),

  institutions: async (query: Query) => {
    const term = String(query.search ?? '').toLowerCase();
    const status = String(query.status ?? '');
    const instType = String(query.institutionType ?? '');
    const filtered = institutions.filter(
      (item) =>
        (!term || item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term)) &&
        (!status || item.status === status) &&
        (!instType || item.type === instType),
    );
    return paginate(filtered, query);
  },

  institution: async (id: number) => {
    const found = institutions.find((item) => item.id === id);
    if (!found) throw new ApiError('Institution not found.', 404);
    return found;
  },

  institutionHistory: async (id: number): Promise<InstitutionHistory> => ({
    status: [],
    audit: auditEntries.filter((entry) => entry.subjectType === 'Institution' && entry.subjectId === id).map((entry) => ({
      id: entry.id,
      action: entry.action,
      actor: entry.actor?.name ?? null,
      old: entry.old,
      new: entry.new,
      ip: entry.ip,
      at: entry.at,
    })),
  }),

  createInstitution: async (input: CreateInstitutionInput): Promise<InstitutionDetail> => {
    const nextId = Math.max(0, ...institutions.map((i) => i.id)) + 1;
    const created: InstitutionDetail = {
      id: nextId,
      code: input.code.toUpperCase(),
      name: input.name,
      type: input.institutionType,
      status: input.status,
      verificationStatus: 'pending',
      officialEmail: input.officialEmail,
      state: input.state,
      trialEndsAt: input.status === 'trial' ? new Date(Date.now() + (input.trialDays ?? settings.defaultTrialDays) * 86_400_000).toISOString() : null,
      usersCount: 1,
      studentsCount: 0,
      createdAt: new Date().toISOString(),
      registrationNumber: input.registrationNumber ?? null,
      contactPhone: input.contactPhone,
      website: input.website ?? null,
      country: input.country,
      district: input.district ?? null,
      address: input.address,
      pincode: input.pincode ?? null,
      suspendedAt: null,
      suspensionReason: null,
      allowedTransitions: ALLOWED_TRANSITIONS[input.status],
      scheduledChange: null,
      counts: { campuses: 1, departments: 0, students: 0, staff: 0, admins: 1, users: 1 },
      admins: [{ id: nextId + 100, name: input.adminName, email: input.adminEmail, status: 'pending', lastLoginAt: null }],
      aiUsage30d: { calls: 0, estimatedCostUsd: 0 },
    };
    institutions.unshift(created);
    return created;
  },

  updateInstitution: async (id: number, input: Partial<InstitutionProfileInput>): Promise<InstitutionDetail> => {
    const target = await ownerDemoApi.institution(id);
    Object.assign(target, input);
    return target;
  },

  verifyInstitution: async (id: number, input: { status: VerificationStatus }): Promise<InstitutionDetail> => {
    const target = await ownerDemoApi.institution(id);
    target.verificationStatus = input.status;
    return target;
  },

  changeInstitutionStatus: async (id: number, input: { status: InstitutionStatus; reason?: string }) => {
    const target = await ownerDemoApi.institution(id);
    target.status = input.status;
    target.allowedTransitions = ALLOWED_TRANSITIONS[input.status];
    target.suspensionReason = input.status === 'suspended' ? (input.reason ?? null) : null;
    target.suspendedAt = input.status === 'suspended' ? new Date().toISOString() : null;
    return { data: target, scheduled: false };
  },

  uploadInstitutionLogo: async (id: number): Promise<InstitutionDetail> => {
    const target = await ownerDemoApi.institution(id);
    return { ...target };
  },

  deleteInstitutionLogo: async (id: number): Promise<InstitutionDetail> => {
    const target = await ownerDemoApi.institution(id);
    return { ...target };
  },

  institutionSettings: async (id: number): Promise<InstitutionSettingsResponse> => ({
    overrides: { ...(demoInstitutionOverrides[id] ?? {}) },
    allowedKeys: ['defaultTimezone', 'defaultLanguage', 'currency', 'dateFormat', 'maxUploadMb', 'sessionTimeoutMinutes'],
    defaults: {
      defaultTimezone: settings.defaultTimezone,
      defaultLanguage: settings.defaultLanguage ?? 'en',
      currency: settings.currency,
      dateFormat: settings.dateFormat,
      maxUploadMb: settings.maxUploadMb,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 120,
    },
  }),

  saveInstitutionSettings: async (id: number, input: Record<string, unknown>): Promise<InstitutionSettingsResponse> => {
    demoInstitutionOverrides[id] = { ...(demoInstitutionOverrides[id] ?? {}), ...input };
    return ownerDemoApi.institutionSettings(id);
  },

  users: async (query: Query) => {
    const term = String(query.search ?? '').toLowerCase();
    const role = String(query.role ?? '');
    const status = String(query.status ?? '');
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const platformOnly = Boolean(query.platformOnly);
    const filtered = users.filter(
      (person) =>
        (!term || person.name.toLowerCase().includes(term) || person.email.toLowerCase().includes(term)) &&
        (!role || person.role === role) &&
        (!status || person.status === status) &&
        (!institutionId || person.institutionId === institutionId) &&
        (!platformOnly || person.isPlatform),
    );
    return paginate<PlatformUserSummary>(filtered, query);
  },

  user: async (id: number) => {
    const found = users.find((person) => person.id === id);
    if (!found) throw new ApiError('User not found.', 404);
    return found;
  },

  inviteUser: async (input: { name: string; email: string }): Promise<PlatformUserDetail> => {
    const nextId = Math.max(0, ...users.map((u) => u.id)) + 1;
    const created: PlatformUserDetail = {
      id: nextId,
      name: input.name,
      email: input.email,
      role: 'super_admin',
      roleLabel: 'Platform Owner',
      platformRole: null,
      isPlatform: true,
      status: 'active',
      institutionId: null,
      institution: null,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      statusReason: null,
      title: 'Platform Owner',
      phone: null,
      emailVerified: true,
      lockedUntil: null,
      activeSessions: 0,
      ownerPermissions: ['owner.*'],
      recentLogins: [],
    };
    users.unshift(created);
    return created;
  },

  changeUserStatus: async (id: number, input: { status: 'active' | 'suspended'; reason?: string }) => {
    const target = await ownerDemoApi.user(id);
    target.status = input.status;
    target.statusReason = input.reason ?? null;
    return target;
  },

  sendPasswordReset: async () => ({ message: 'Demo mode: password reset simulation sent.' }),

  revokeUserSessions: async (id: number) => {
    const target = await ownerDemoApi.user(id);
    target.activeSessions = 0;
    return { message: 'Demo sessions cleared.' };
  },

  settings: async (): Promise<PlatformSettings> => ({ ...settings }),

  saveSettings: async (input: Partial<PlatformSettings>): Promise<PlatformSettings> => {
    settings = { ...settings, ...input };
    return { ...settings };
  },

  auditLogs: async (query: Query) => {
    const action = String(query.action ?? '').toLowerCase();
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const instName = institutionId ? institutions.find((i) => i.id === institutionId)?.name ?? '__none__' : null;
    return paginate(
      auditEntries.filter((e) => (!action || e.action.toLowerCase().includes(action)) && (!instName || e.institution === instName)),
      query,
    );
  },

  activityLogs: async (query: Query = {}) => {
    const action = String(query.action ?? '').toLowerCase();
    const search = String(query.search ?? '').toLowerCase();
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const instName = institutionId ? institutions.find((i) => i.id === institutionId)?.name ?? '__none__' : null;
    return paginate(
      demoActivityLogs.filter(
        (e) =>
          (!action || e.action.toLowerCase().includes(action)) &&
          (!instName || e.institution === instName) &&
          (!search || JSON.stringify(e).toLowerCase().includes(search)),
      ),
      query,
    );
  },

  loginHistory: async (query: Query) => {
    const outcome = String(query.outcome ?? '');
    const email = String(query.email ?? '').toLowerCase();
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const instName = institutionId ? institutions.find((i) => i.id === institutionId)?.name ?? '__none__' : null;
    const filtered = loginEntries.filter(
      (e) => (!outcome || e.outcome === outcome) && (!email || e.email.toLowerCase().includes(email)) && (!instName || e.institution === instName),
    );
    const page = paginate(filtered, query);
    return { ...page, summary: { success: filtered.filter((e) => e.outcome === 'success').length } };
  },

  securityEvents: async (query: Query = {}) => {
    const severity = String(query.severity ?? '');
    const status = String(query.status ?? '');
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const instName = institutionId ? institutions.find((i) => i.id === institutionId)?.name ?? '__none__' : null;
    return paginate(
      demoSecurityEvents.filter(
        (e) => (!severity || e.severity === severity) && (!status || e.status === status) && (!instName || e.institution === instName),
      ),
      query,
    );
  },

  updateSecurityEvent: async (id: number, status: SecurityEvent['status']) => {
    const found = demoSecurityEvents.find((e) => e.id === id);
    if (!found) throw new ApiError('Security event not found.', 404);
    found.status = status;
    if (status === 'resolved') {
      found.resolvedBy = 'Platform Owner';
      found.resolvedAt = new Date().toISOString();
    }
    return { id: found.id, status: found.status };
  },

  sessions: async (query: Query = {}) => {
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const instName = institutionId ? institutions.find((i) => i.id === institutionId)?.name ?? '__none__' : null;
    return activeSessions.filter((s) => !instName || s.institution === instName);
  },

  revokeSession: async (id: number) => {
    activeSessions = activeSessions.filter((s) => s.id !== id);
    return { message: 'Session ended.' };
  },

  health: async (): Promise<SystemHealthSnapshot> => ({
    status: 'ok',
    checkedAt: new Date().toISOString(),
    checks: [
      { key: 'mode', label: 'Runtime mode', status: 'warning', detail: 'Offline demo store (set VITE_API_BASE_URL for Laravel backend)', value: 'demo' },
      { key: 'tenants', label: 'Tenant institutions', status: 'ok', detail: `${institutions.length} demo institutions loaded`, value: institutions.length },
      { key: 'queue', label: 'Background jobs', status: 'ok', detail: 'Offline demo mode ready', value: 0 },
    ],
  }),

  incidents: async (query: Query = {}): Promise<SystemIncident[]> => {
    const status = String(query.status ?? '');
    return demoIncidents.filter((i) => !status || i.status === status);
  },

  createIncident: async (input: { title: string; severity: SystemIncident['severity']; component: string; summary: string; impact?: string }) => {
    const created: SystemIncident = {
      id: Math.max(0, ...demoIncidents.map((i) => i.id)) + 1,
      title: input.title,
      severity: input.severity,
      status: 'open',
      component: input.component,
      summary: input.summary,
      impact: input.impact ?? null,
      assignee: { id: 900, name: 'Platform Owner' },
      creator: 'Platform Owner',
      acknowledgedAt: null,
      resolvedAt: null,
      resolutionNote: null,
      createdAt: new Date().toISOString(),
    };
    demoIncidents.unshift(created);
    return { id: created.id, status: created.status };
  },

  updateIncident: async (id: number, input: { status?: SystemIncident['status']; severity?: SystemIncident['severity']; resolutionNote?: string }) => {
    const found = demoIncidents.find((i) => i.id === id);
    if (!found) throw new ApiError('Incident not found.', 404);
    if (input.status) found.status = input.status;
    if (input.severity) found.severity = input.severity;
    if (input.resolutionNote !== undefined) found.resolutionNote = input.resolutionNote;
    if (input.status === 'resolved') found.resolvedAt = new Date().toISOString();
    return { id: found.id, status: found.status };
  },

  mfaStatus: async (): Promise<MfaStatus> => ({ enabled: false, enabledAt: null, required: settings.mfaRequiredForPlatformStaff, available: false }),

  plans: async (query: Query = {}): Promise<Plan[]> => {
    const status = String(query.status ?? '');
    return demoPlans.filter((p) => !status || p.status === status);
  },

  plan: async (id: number): Promise<Plan> => {
    const found = demoPlans.find((p) => p.id === id);
    if (!found) throw new ApiError('Plan not found.', 404);
    return { ...found, versions: found.currentVersion ? [found.currentVersion] : [] };
  },

  createPlan: async (input: PlanInput): Promise<Plan> => {
    const nextId = Math.max(0, ...demoPlans.map((p) => p.id)) + 1;
    const plan: Plan = {
      id: nextId,
      code: (input.code ?? `PLAN_${nextId}`).toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'draft',
      sortOrder: input.sortOrder ?? nextId,
      isPublic: input.isPublic ?? true,
      subscriptionsCount: 0,
      activeSubscriptionsCount: 0,
      updatedAt: new Date().toISOString(),
      currentVersion: {
        id: nextId * 10,
        versionNumber: 1,
        billingCycle: input.billingCycle,
        price: input.price,
        setupFee: input.setupFee,
        currency: input.currency,
        trialDays: input.trialDays,
        studentLimit: input.studentLimit ?? null,
        facultyLimit: input.facultyLimit ?? null,
        campusLimit: input.campusLimit ?? null,
        departmentLimit: input.departmentLimit ?? null,
        recruiterLimit: input.recruiterLimit ?? null,
        storageLimitMb: input.storageLimitMb,
        apiRequestsLimit: input.apiRequestsLimit ?? null,
        aiCreditAllocation: input.aiCreditAllocation,
        aiCreditResetPeriod: input.aiCreditResetPeriod,
        features: input.features,
        isCurrent: true,
        publishedAt: input.status === 'active' ? new Date().toISOString() : null,
      },
    };
    demoPlans = [...demoPlans, plan];
    return plan;
  },

  updatePlan: async (id: number, input: Partial<PlanInput>): Promise<Plan> => {
    const found = demoPlans.find((p) => p.id === id);
    if (!found) throw new ApiError('Plan not found.', 404);
    found.name = input.name ?? found.name;
    found.description = input.description !== undefined ? input.description : found.description;
    if (found.currentVersion) {
      found.currentVersion = {
        ...found.currentVersion,
        versionNumber: found.currentVersion.versionNumber + 1,
        price: input.price ?? found.currentVersion.price,
        setupFee: input.setupFee ?? found.currentVersion.setupFee,
        billingCycle: input.billingCycle ?? found.currentVersion.billingCycle,
        aiCreditAllocation: input.aiCreditAllocation ?? found.currentVersion.aiCreditAllocation,
        features: input.features ? { ...found.currentVersion.features, ...input.features } : found.currentVersion.features,
      };
    }
    return { ...found };
  },

  clonePlan: async (id: number, input: { code?: string; name?: string } = {}): Promise<Plan> => {
    const src = demoPlans.find((p) => p.id === id);
    if (!src || !src.currentVersion) throw new ApiError('Plan not found.', 404);
    return ownerDemoApi.createPlan({
      code: input.code ?? `${src.code}_COPY`,
      name: input.name ?? `${src.name} Copy`,
      status: 'draft',
      billingCycle: src.currentVersion.billingCycle,
      price: src.currentVersion.price,
      setupFee: src.currentVersion.setupFee,
      currency: src.currentVersion.currency,
      trialDays: src.currentVersion.trialDays,
      storageLimitMb: src.currentVersion.storageLimitMb,
      aiCreditAllocation: src.currentVersion.aiCreditAllocation,
      aiCreditResetPeriod: src.currentVersion.aiCreditResetPeriod,
      features: { ...src.currentVersion.features },
    });
  },

  publishPlan: async (id: number): Promise<Plan> => {
    const found = demoPlans.find((p) => p.id === id);
    if (!found) throw new ApiError('Plan not found.', 404);
    found.status = 'active';
    return { ...found };
  },

  archivePlan: async (id: number): Promise<Plan> => {
    const found = demoPlans.find((p) => p.id === id);
    if (!found) throw new ApiError('Plan not found.', 404);
    found.status = 'archived';
    return { ...found };
  },

  deletePlan: async (id: number) => {
    if (demoSubscriptions.some((s) => s.plan?.id === id)) {
      throw new ApiError('Plans referenced by subscriptions cannot be deleted; archive the plan instead.', 422);
    }
    demoPlans = demoPlans.filter((p) => p.id !== id);
    return { message: 'Plan deleted.' };
  },

  subscriptions: async (query: Query = {}) => {
    const status = String(query.status ?? '');
    const planId = query.planId ? Number(query.planId) : null;
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    return paginate(
      demoSubscriptions.filter(
        (s) =>
          (!status || s.status === status) &&
          (!planId || s.plan?.id === planId) &&
          (!institutionId || s.institution?.id === institutionId),
      ),
      query,
    );
  },

  subscription: async (id: number) => {
    const found = demoSubscriptions.find((s) => s.id === id);
    if (!found) throw new ApiError('Subscription not found.', 404);
    return found;
  },

  assignSubscription: async (input: { institutionId: number; planId: number; status?: 'trial' | 'active'; trialDays?: number }): Promise<Subscription> => {
    const inst = institutions.find((i) => i.id === input.institutionId);
    const plan = demoPlans.find((p) => p.id === input.planId);
    if (!inst || !plan || !plan.currentVersion) throw new ApiError('Invalid institution or plan.', 422);
    const created: Subscription = {
      id: Math.max(0, ...demoSubscriptions.map((s) => s.id)) + 1,
      institution: { id: inst.id, name: inst.name, code: inst.code, status: inst.status },
      plan: { id: plan.id, code: plan.code, name: plan.name },
      planVersionId: plan.currentVersion.id,
      planVersionNumber: plan.currentVersion.versionNumber,
      status: input.status ?? 'active',
      billingCycle: plan.currentVersion.billingCycle,
      amount: plan.currentVersion.price,
      currency: plan.currentVersion.currency,
      mrr: plan.currentVersion.price,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      trialStartAt: input.status === 'trial' ? new Date().toISOString() : null,
      trialEndAt: input.status === 'trial' ? new Date(Date.now() + (input.trialDays ?? 14) * 86_400_000).toISOString() : null,
      renewalAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      graceEndsAt: null,
      graceDays: 7,
      expiryBehavior: 'grace_then_readonly',
      autoRenew: true,
      cancelReason: null,
      cancelledAt: null,
      pausedAt: null,
      entitlementSnapshot: { limits: { students: plan.currentVersion.studentLimit, aiCredits: plan.currentVersion.aiCreditAllocation }, features: plan.currentVersion.features },
      events: [{ id: 1, eventType: 'created', fromStatus: null, toStatus: input.status ?? 'active', reason: 'Assigned', actor: 'Platform Owner', at: new Date().toISOString() }],
    };
    demoSubscriptions = [created, ...demoSubscriptions];
    return created;
  },

  changeSubscriptionPlan: async (id: number, input: { planId: number; reason?: string }) => {
    const sub = await ownerDemoApi.subscription(id);
    const plan = demoPlans.find((p) => p.id === input.planId);
    if (plan && plan.currentVersion) {
      sub.plan = { id: plan.id, code: plan.code, name: plan.name };
      sub.amount = plan.currentVersion.price;
      sub.mrr = plan.currentVersion.price;
    }
    return { ...sub };
  },

  renewSubscription: async (id: number, _generateInvoice = true) => {
    const sub = await ownerDemoApi.subscription(id);
    sub.status = 'active';
    return { ...sub };
  },

  pauseSubscription: async (id: number, _reason?: string) => {
    const sub = await ownerDemoApi.subscription(id);
    sub.status = 'paused';
    return { ...sub };
  },

  resumeSubscription: async (id: number) => {
    const sub = await ownerDemoApi.subscription(id);
    sub.status = 'active';
    return { ...sub };
  },

  extendSubscription: async (id: number, input: { days: number }) => {
    const sub = await ownerDemoApi.subscription(id);
    sub.endAt = new Date(new Date(sub.endAt).getTime() + input.days * 86_400_000).toISOString();
    return { ...sub };
  },

  cancelSubscription: async (id: number, input: { reason: string }) => {
    const sub = await ownerDemoApi.subscription(id);
    sub.status = 'cancelled';
    sub.cancelReason = input.reason;
    return { ...sub };
  },

  invoices: async (query: Query = {}) => {
    const status = String(query.status ?? '');
    const search = String(query.search ?? '').toLowerCase();
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    return paginate(
      demoInvoices.filter(
        (i) =>
          (!status || i.status === status) &&
          (!institutionId || i.institution?.id === institutionId) &&
          (!search || i.invoiceNumber.toLowerCase().includes(search) || (i.institution?.name ?? '').toLowerCase().includes(search)),
      ),
      query,
    );
  },

  invoice: async (id: number): Promise<Invoice> => {
    const inv = demoInvoices.find((i) => i.id === id);
    if (!inv) throw new ApiError('Invoice not found.', 404);
    return {
      ...inv,
      payments: demoPayments.filter((p) => p.invoiceId === id),
      refunds: demoRefunds.filter((r) => r.invoiceId === id),
    };
  },

  createInvoice: async (input: { institutionId: number; currency?: string; items: InvoiceItem[] }): Promise<Invoice> => {
    const inst = institutions.find((i) => i.id === input.institutionId);
    const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const inv: Invoice = {
      id: demoInvoices.length + 1,
      invoiceNumber: `INV-202611-${String(demoInvoices.length + 1).padStart(4, '0')}`,
      institution: inst ? { id: inst.id, name: inst.name, code: inst.code } : null,
      subscriptionId: null,
      status: 'issued',
      currency: input.currency ?? settings.currency,
      billingPeriodStart: new Date().toISOString().slice(0, 10),
      billingPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
      subtotal,
      discountAmount: 0,
      taxRatePercent: 18,
      taxAmount: Math.round(subtotal * 18) / 100,
      total: Math.round(subtotal * 118) / 100,
      paidAmount: 0,
      balance: Math.round(subtotal * 118) / 100,
      gstin: null,
      placeOfSupply: null,
      notes: null,
      items: input.items,
      createdAt: new Date().toISOString(),
    };
    demoInvoices.unshift(inv);
    return inv;
  },

  issueInvoice: async (id: number) => demoInvoices.find((i) => i.id === id)!,
  voidInvoice: async (id: number) => {
    const inv = demoInvoices.find((i) => i.id === id)!;
    inv.status = 'void';
    inv.balance = 0;
    return { ...inv };
  },
  payments: async (query: Query = {}) => {
    const status = String(query.status ?? '');
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    return paginate(
      demoPayments.filter((p) => (!status || p.status === status) && (!institutionId || p.institution?.id === institutionId)),
      query,
    );
  },
  recordPayment: async (input: { invoiceId: number; amount?: number; gateway?: string; method?: string }) => {
    const inv = demoInvoices.find((i) => i.id === input.invoiceId)!;
    const amt = input.amount ?? inv.balance;
    inv.paidAmount += amt;
    inv.balance = Math.max(0, inv.total - inv.paidAmount);
    inv.status = inv.balance === 0 ? 'paid' : 'partially_paid';
    const payment: Payment = {
      id: demoPayments.length + 1,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      institution: inv.institution,
      paymentReference: `PAY-DEMO${demoPayments.length + 1}`,
      gateway: input.gateway ?? 'manual',
      method: input.method ?? 'bank_transfer',
      amount: amt,
      refundedAmount: 0,
      refundableAmount: amt,
      currency: inv.currency,
      status: 'succeeded',
      gatewayEventId: null,
      failureReason: null,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    demoPayments.unshift(payment);
    return { data: payment, duplicate: false };
  },
  refunds: async (query: Query = {}) => paginate(demoRefunds, query),
  requestRefund: async (input: { paymentId: number; amount: number; reason: string }): Promise<Refund> => {
    const p = demoPayments.find((x) => x.id === input.paymentId)!;
    const refund: Refund = {
      id: demoRefunds.length + 1,
      paymentId: p.id,
      paymentReference: p.paymentReference,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoiceNumber,
      institution: p.institution,
      amount: input.amount,
      currency: p.currency,
      reason: input.reason,
      status: 'requested',
      gatewayRefundReference: null,
      requestedBy: 'Platform Owner',
      rejectionReason: null,
      approvedAt: null,
      executedAt: null,
      createdAt: new Date().toISOString(),
    };
    demoRefunds.unshift(refund);
    return refund;
  },
  approveRefund: async (id: number) => {
    const r = demoRefunds.find((x) => x.id === id)!;
    r.status = 'approved';
    return { ...r };
  },
  rejectRefund: async (id: number, reason: string) => {
    const r = demoRefunds.find((x) => x.id === id)!;
    r.status = 'rejected';
    r.rejectionReason = reason;
    return { ...r };
  },
  executeRefund: async (id: number) => {
    const r = demoRefunds.find((x) => x.id === id)!;
    r.status = 'executed';
    return { ...r };
  },
  revenueSummary: async (): Promise<RevenueSummary> => ({
    currency: settings.currency,
    period: { from: new Date(Date.now() - 30 * 86_400_000).toISOString(), to: new Date().toISOString() },
    mrr: demoSubscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0),
    arr: demoSubscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0) * 12,
    invoiced: demoInvoices.reduce((s, i) => s + i.total, 0),
    collected: demoPayments.reduce((s, p) => s + p.amount, 0),
    refunded: 0,
    outstanding: demoInvoices.reduce((s, i) => s + i.balance, 0),
    subscriptions: { active: demoSubscriptions.filter((s) => s.status === 'active').length, trial: 1, pastDue: 0, total: demoSubscriptions.length, trialConversionRate: 50, churnRate: 0 },
    byPlan: [],
    byInstitution: [],
  }),
  taxProfiles: async () => [...demoTaxProfiles],
  createTaxProfile: async (input: { code: string; name: string; taxType: string; ratePercent: number; gstin?: string; placeOfSupply?: string; isDefault?: boolean }) => {
    const row: TaxProfile = {
      id: demoTaxProfiles.length + 1,
      code: input.code.toUpperCase(),
      name: input.name,
      taxType: input.taxType as TaxProfile['taxType'],
      ratePercent: input.ratePercent,
      gstin: input.gstin ?? null,
      placeOfSupply: input.placeOfSupply ?? null,
      isDefault: Boolean(input.isDefault),
      isActive: true,
    };
    demoTaxProfiles.push(row);
    return row;
  },
  updateTaxProfile: async (id: number, input: { isActive?: boolean; isDefault?: boolean }) => {
    const row = demoTaxProfiles.find((t) => t.id === id);
    if (!row) throw new ApiError('Tax profile not found.', 404);
    Object.assign(row, input);
    return { ...row };
  },
  coupons: async () => [...demoCoupons],
  createCoupon: async (input: { code: string; name: string; discountType: 'percent' | 'fixed'; discountValue: number; currency?: string; maxRedemptions?: number | null }) => {
    const row: Coupon = {
      id: demoCoupons.length + 1,
      code: input.code.toUpperCase(),
      name: input.name,
      discountType: input.discountType,
      discountValue: input.discountValue,
      currency: input.currency ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      redemptionsCount: 0,
      validFrom: null,
      validUntil: null,
      isActive: true,
    };
    demoCoupons.push(row);
    return row;
  },
  updateCoupon: async (id: number, input: { isActive?: boolean; maxRedemptions?: number | null }) => {
    const row = demoCoupons.find((c) => c.id === id);
    if (!row) throw new ApiError('Coupon not found.', 404);
    Object.assign(row, input);
    return { ...row };
  },

  aiUsage: async (query: Query = {}) => {
    const institutionId = query.institutionId ? Number(query.institutionId) : null;
    const feature = String(query.feature ?? '');
    const provider = String(query.provider ?? '');
    const model = String(query.model ?? '').toLowerCase();
    const filtered = demoAiLogs.filter(
      (l) =>
        (!institutionId || l.institution?.id === institutionId) &&
        (!feature || l.feature === feature) &&
        (!provider || l.provider === provider) &&
        (!model || l.model.toLowerCase().includes(model)),
    );
    return {
      ...paginate(filtered, query),
      summary: {
        calls: filtered.length,
        failures: filtered.filter((l) => l.status !== 'success').length,
        tokens: filtered.reduce((s, l) => s + l.promptTokens + l.completionTokens, 0),
        estimatedCostUsd: Number(filtered.reduce((s, l) => s + l.estimatedCostUsd, 0).toFixed(4)),
        creditsCharged: filtered.reduce((s, l) => s + l.creditsCharged, 0),
      },
    };
  },
  aiCredits: async (_query: Query = {}) => ({
    data: [...demoWallets],
    summary: {
      allocated: demoWallets.reduce((s, w) => s + w.allocatedTotal, 0),
      consumed: demoWallets.reduce((s, w) => s + w.consumedTotal, 0),
      remaining: demoWallets.reduce((s, w) => s + w.balance, 0),
    },
  }),
  aiCreditLedger: async (institutionId: number) => ({
    wallet: demoWallets.find((w) => w.institution?.id === institutionId) ?? demoWallets[0],
    ...paginate(demoLedger[institutionId] ?? [], {}),
  }),
  adjustAiCredits: async (input: { institutionId: number; transactionType: string; creditsDelta: number; reason: string }) => {
    const w = demoWallets.find((x) => x.institution?.id === input.institutionId) ?? demoWallets[0];
    w.balance += input.creditsDelta;
    if (input.creditsDelta > 0) w.allocatedTotal += input.creditsDelta;
    else w.consumedTotal += Math.abs(input.creditsDelta);
    demoLedger[input.institutionId] = [
      { id: Date.now(), type: input.transactionType, creditsDelta: input.creditsDelta, balanceAfter: w.balance, reason: input.reason, expiresAt: null, actor: 'Platform Owner', at: new Date().toISOString() },
      ...(demoLedger[input.institutionId] ?? []),
    ];
    return { transactionId: Date.now(), wallet: { ...w } };
  },
  updateAiWalletPolicy: async (institutionId: number, input: { monthlyQuota?: number | null; warningThresholdPercent?: number; hardStopOnExhaustion?: boolean; chargeFailedRequests?: boolean }) => {
    const w = demoWallets.find((x) => x.institution?.id === institutionId) ?? demoWallets[0];
    Object.assign(w, input);
    return { ...w };
  },
  aiProviders: async (): Promise<AiProvidersResponse> => ({
    providers: [{ key: 'anthropic', name: 'Anthropic Claude', configured: false, maskedKey: null, models: ['claude-opus-5-5'], chain: ['anthropic:claude-opus-5-5'], timeoutSeconds: 30 }],
    rateCards: [...demoRateCards],
    services: ['resume_parse', 'resume_analysis', 'interview_plan', 'interview_turn', 'interview_turn_analysis', 'interview_evaluation'],
  }),
  saveAiRateCard: async (input: {
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
  }) => {
    const rc: AiRateCard = {
      id: demoRateCards.length + 1,
      serviceKey: input.serviceKey,
      provider: input.provider,
      model: input.model,
      creditsPerRequest: input.creditsPerRequest,
      creditsPer1kTokens: input.creditsPer1kTokens ?? 0,
      usdPer1kInputTokens: input.usdPer1kInputTokens ?? 0.004,
      usdPer1kOutputTokens: input.usdPer1kOutputTokens ?? 0.02,
      rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
      warningThresholdPercent: input.warningThresholdPercent ?? 80,
      chargeOnFailure: input.chargeOnFailure ?? false,
      isActive: true,
    };
    demoRateCards.push(rc);
    return rc;
  },
  updateAiRateCard: async (id: number, input: { isActive?: boolean; creditsPerRequest?: number; creditsPer1kTokens?: number }) => {
    const rc = demoRateCards.find((r) => r.id === id);
    if (!rc) throw new ApiError('Rate card not found.', 404);
    Object.assign(rc, input);
    return { ...rc };
  },

  institutionLogs: async (id: number, query: Query = {}): Promise<InstitutionLogsBundle> => {
    const inst = institutions.find((i) => i.id === id);
    if (!inst) throw new ApiError('Institution not found.', 404);
    const search = String(query.search ?? '').trim().toLowerCase();
    const category = (String(query.category ?? 'all') || 'all') as CollegeLogCategory;
    const matchSearch = (row: unknown) => !search || JSON.stringify(row).toLowerCase().includes(search);

    const history = await ownerDemoApi.institutionHistory(id);
    const audit = auditEntries.filter((e) => e.institution === inst.name).filter(matchSearch);
    const activity = demoActivityLogs.filter((e) => e.institution === inst.name).filter(matchSearch);
    const logins = loginEntries.filter((e) => e.institution === inst.name).filter(matchSearch);
    const security = demoSecurityEvents.filter((e) => e.institution === inst.name).filter(matchSearch);
    const status = (
      history.status.length > 0
        ? history.status
        : [
            {
              id: id * 10 + 1,
              kind: 'verification' as const,
              from: 'pending',
              to: inst.verificationStatus,
              reason: 'Verification record',
              effectiveAt: inst.createdAt ?? new Date().toISOString(),
              applied: true,
              actor: 'Platform Owner',
              at: inst.createdAt ?? new Date().toISOString(),
            },
          ]
    ).filter(matchSearch);
    const subscription = demoSubscriptions
      .filter((s) => s.institution?.id === id)
      .flatMap((s) =>
        s.events.map((ev) => ({
          id: ev.id,
          subscriptionId: s.id,
          eventType: ev.eventType,
          fromStatus: ev.fromStatus,
          toStatus: ev.toStatus,
          reason: ev.reason,
          metadata: null,
          actor: ev.actor,
          at: ev.at,
        })),
      )
      .filter(matchSearch);
    const ai = demoAiLogs
      .filter((l) => l.institution?.id === id)
      .map((l) => ({
        id: l.id,
        feature: l.feature,
        provider: l.provider,
        model: l.model,
        status: l.status,
        user: l.user ? { id: l.user.id, name: l.user.name, email: '' } : null,
        promptTokens: l.promptTokens,
        completionTokens: l.completionTokens,
        latencyMs: l.latencyMs,
        creditsCharged: l.creditsCharged,
        estimatedCostUsd: l.estimatedCostUsd,
        error: l.error,
        at: l.at,
      }))
      .filter(matchSearch);

    const timeline: CollegeLogTimelineItem[] = [
      ...(category === 'all' || category === 'audit'
        ? audit.map((r) => ({
            id: `audit-${r.id}`,
            category: 'audit' as const,
            title: r.action,
            detail: r.subjectType ? `${r.subjectType} #${r.subjectId ?? ''}` : inst.name,
            statusOrSeverity: 'audit',
            actor: r.actor?.email ?? 'System',
            ip: r.ip,
            at: r.at,
            metadata: { old: r.old, new: r.new },
          }))
        : []),
      ...(category === 'all' || category === 'activity'
        ? activity.map((r) => ({
            id: `activity-${r.id}`,
            category: 'activity' as const,
            title: `${r.modelType ?? 'Record'} ${r.action}`,
            detail: `#${r.modelId}`,
            statusOrSeverity: r.action,
            actor: r.actor?.email ?? 'System',
            ip: r.ip,
            at: r.at,
            metadata: r.changes,
          }))
        : []),
      ...(category === 'all' || category === 'login'
        ? logins.map((r) => ({
            id: `login-${r.id}`,
            category: 'login' as const,
            title: `Sign-in ${r.outcome}`,
            detail: r.reason ? `${r.email} · ${r.reason}` : r.email,
            statusOrSeverity: r.outcome,
            actor: r.email,
            ip: r.ip,
            at: r.at,
            metadata: { userAgent: r.userAgent },
          }))
        : []),
      ...(category === 'all' || category === 'security'
        ? security.map((r) => ({
            id: `security-${r.id}`,
            category: 'security' as const,
            title: r.eventType.replace(/_/g, ' '),
            detail: r.summary,
            statusOrSeverity: r.severity,
            actor: r.email ?? 'System',
            ip: r.ip,
            at: r.at,
            metadata: r.metadata,
          }))
        : []),
      ...(category === 'all' || category === 'status'
        ? status.map((r) => ({
            id: `status-${r.id}`,
            category: 'status' as const,
            title: `${r.kind === 'verification' ? 'Verification' : 'Status'}: ${r.from ? `${r.from} → ` : ''}${r.to}`,
            detail: r.reason ?? 'Status updated',
            statusOrSeverity: r.to,
            actor: r.actor ?? 'System',
            ip: null,
            at: r.at,
            metadata: { effectiveAt: r.effectiveAt, applied: r.applied },
          }))
        : []),
      ...(category === 'all' || category === 'subscription'
        ? subscription.map((r) => ({
            id: `sub-${r.id}`,
            category: 'subscription' as const,
            title: `Subscription ${r.eventType}`,
            detail: [r.fromStatus ? `${r.fromStatus} → ${r.toStatus ?? ''}` : r.toStatus, r.reason].filter(Boolean).join(' · '),
            statusOrSeverity: r.toStatus ?? r.eventType,
            actor: r.actor ?? 'System',
            ip: null,
            at: r.at,
            metadata: r.metadata,
          }))
        : []),
      ...(category === 'all' || category === 'ai'
        ? ai.map((r) => ({
            id: `ai-${r.id}`,
            category: 'ai' as const,
            title: `AI ${r.feature}`,
            detail: `${r.model} · ${r.creditsCharged} credits · ${r.latencyMs}ms`,
            statusOrSeverity: r.status,
            actor: r.user?.name ?? 'System',
            ip: null,
            at: r.at,
            metadata: { provider: r.provider, promptTokens: r.promptTokens, completionTokens: r.completionTokens, estimatedCostUsd: r.estimatedCostUsd },
          }))
        : []),
    ].sort((a, b) => b.at.localeCompare(a.at));

    return {
      institution: { id: inst.id, code: inst.code, name: inst.name, status: inst.status },
      counts: {
        audit: audit.length,
        activity: activity.length,
        login: logins.length,
        security: security.length,
        status: status.length,
        subscription: subscription.length,
        ai: ai.length,
        total: audit.length + activity.length + logins.length + security.length + status.length + subscription.length + ai.length,
      },
      timeline,
      audit,
      activity,
      logins,
      security,
      status,
      subscription,
      ai,
    };
  },
};

