/**
 * Owner Console Releases 3, 4 & 5 typed API client, React Query hooks, and offline demo store:
 * Oversight (§5.10–§5.14), Analytics & 11 SRS Reports (§5.15/§13), CRM & Onboarding (§5.3/§5.17),
 * Support Tickets & SLA (§5.16), Announcements/CMS/Releases (§5.18/§5.24/§5.25),
 * Integrations/API/Webhooks (§5.21), and Data Governance/Backups (§5.23).
 */
import { useQuery } from '@tanstack/react-query';
import { ApiError, http, isApiConfigured } from './http';

type Query = Record<string, string | number | boolean | null | undefined>;

export interface AcademicOversight {
  totals: { institutions: number; campuses: number; departments: number; courses: number; batches: number; academicYears: number; semesters: number; students: number };
  institutions: { institutionId: number; code: string; name: string; status: string; campuses: number; departments: number; courses: number; batches: number; academicYears: number; semesters: number; students: number; completenessPercent: number }[];
}

export interface PlacementOversight {
  totals: { companies: number; drives: number; jobPostings: number; applications: number; shortlisted: number; offers: number; placements: number; placementRatePercent: number; avgCtcLpa: number; maxCtcLpa: number };
  institutions: { institutionId: number; code: string; name: string; companies: number; drives: number; applications: number; shortlisted: number; offers: number; accepted: number; avgCtcLpa: number }[];
}

export interface AssessmentOversight {
  readOnlyNotice: string;
  totals: { exams: number; scheduled: number; ongoing: number; completed: number; markEntries: number; absentEntries: number; passRatePercent: number; avgMarks: number; avgSemesterPercentage: number };
  institutions: { institutionId: number; code: string; name: string; exams: number; markEntries: number; passRatePercent: number }[];
}

export interface ResumeOversight {
  privacyNotice: string;
  totals: { uploads: number; parsed: number; failed: number; analyses: number; avgOverallScore: number; avgAtsScore: number; aiCalls: number; aiFailures: number; avgLatencyMs: number; estimatedCostUsd: number };
  institutions: { institutionId: number; code: string; name: string; uploads: number; parsed: number; failed: number; analyses: number; avgOverallScore: number; avgAtsScore: number }[];
}

export interface InterviewOversight {
  disclaimer: string;
  totals: { sessions: number; completed: number; inProgress: number; failed: number; abandoned: number; evaluated: number; avgScore: number; aiCalls: number; aiFailures: number; avgLatencyMs: number; estimatedCostUsd: number };
  byMode: Record<string, number>;
  institutions: { institutionId: number; code: string; name: string; sessions: number; completed: number; failed: number; evaluated: number; avgScore: number }[];
}

export interface ReportCatalogItem { key: string; label: string; description: string }
export interface ReportPreview { key: string; label: string; columns: string[]; rows: (string | number | null)[][]; summary: Record<string, number | string> }
export interface SavedReport { id: number; name: string; reportKey: string; filters: Record<string, unknown>; format: string; createdBy: string | null; lastRunAt: string | null }
export interface ReportSchedule { id: number; name: string; reportKey: string; frequency: 'daily' | 'weekly' | 'monthly'; format: string; recipients: string[]; isActive: boolean; nextRunAt: string | null; createdBy: string | null }
export interface ExportJob { id: number; reportKey: string; format: string; rowCount: number; status: string; fileName: string | null; actor: string | null; exportedAt: string }

export interface SalesLead {
  id: number;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  source: string;
  stage: 'new' | 'contacted' | 'demo_scheduled' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';
  owner: { id: number; name: string } | null;
  interestedPlan: { id: number; code: string; name: string } | null;
  expectedStudents: number | null;
  expectedMrr: number | null;
  nextFollowUpAt: string | null;
  demoOutcome: string | null;
  lostReason: string | null;
  convertedOnboardingId: number | null;
  notes: string | null;
  activitiesCount: number;
  createdAt: string | null;
  activities?: { id: number; activityType: string; summary: string; outcome: string | null; occurredAt: string; actor: string | null }[];
}

export interface OnboardingItem {
  id: number;
  leadId: number | null;
  institution: { id: number; code: string; name: string; status: string } | null;
  institutionName: string;
  code: string | null;
  institutionType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  country: string;
  state: string | null;
  stage: 'new' | 'verification' | 'demo' | 'proposal' | 'agreement' | 'payment' | 'configuration' | 'training' | 'go_live';
  status: 'active' | 'blocked' | 'completed' | 'cancelled';
  owner: { id: number; name: string } | null;
  targetGoLiveAt: string | null;
  blockerReason: string | null;
  notes: string | null;
  checklist: { id: number; stage: string; title: string; isCompleted: boolean; completedAt: string | null }[];
  createdAt: string | null;
}

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  institution: { id: number; code: string; name: string } | null;
  reporter: string | null;
  assignee: { id: number; name: string } | null;
  subject: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'escalated' | 'resolved' | 'closed';
  escalationLevel: number;
  firstResponseDueAt: string | null;
  firstRespondedAt: string | null;
  resolutionDueAt: string | null;
  resolvedAt: string | null;
  slaBreached: boolean;
  csatScore: number | null;
  csatComment: string | null;
  repliesCount: number;
  attachmentsCount: number;
  createdAt: string | null;
  replies?: { id: number; body: string; isInternal: boolean; author: string; at: string }[];
  attachments?: { id: number; originalName: string; mimeType: string; sizeBytes: number; uploadedBy: string | null; at: string }[];
}

export interface PlatformAnnouncement {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  channels: string[];
  targetScope: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  scheduledAt: string | null;
  publishedAt: string | null;
  deliveredCount: number;
  failedCount: number;
  createdBy: string | null;
  createdAt: string | null;
}

export interface IntegrationItem {
  id: number;
  key: string;
  name: string;
  category: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  configMasked: Record<string, unknown>;
  secretConfigured: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  updatedBy: string | null;
}

export interface ApiClientItem {
  id: number;
  institution: { id: number; code: string; name: string } | null;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  status: 'active' | 'revoked';
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
}

export interface WebhookItem {
  id: number;
  institution: { id: number; code: string; name: string } | null;
  name: string;
  url: string;
  events: string[];
  secretMasked: string | null;
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastStatusCode: number | null;
  deliveries?: { id: number; event: string; responseStatus: number | null; success: boolean; durationMs: number | null; at: string }[];
}

export interface BackupItem {
  id: number;
  backupType: 'full' | 'incremental' | 'config';
  scope: 'platform' | 'institution';
  institution: { id: number; code: string; name: string } | null;
  storageLocation: string;
  sizeMb: number | null;
  status: string;
  verified: boolean;
  restoreTestedAt: string | null;
  restoreOutcome: string | null;
  retentionUntil: string | null;
  notes: string | null;
  triggeredBy: string | null;
  createdAt: string | null;
}

export interface DataRequestItem {
  id: number;
  institution: { id: number; code: string; name: string } | null;
  requestType: 'export' | 'deletion';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
}

export interface CmsPageItem {
  id: number;
  contentType: 'page' | 'faq' | 'policy' | 'release_note';
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'draft' | 'review' | 'published' | 'scheduled' | 'archived';
  publishedAt: string | null;
  currentVersion: number;
  updatedBy: string | null;
  revisions?: { id: number; versionNumber: number; title: string; changeNote: string | null; editor: string | null; at: string }[];
}

export interface ProductReleaseItem {
  id: number;
  version: string;
  title: string;
  releaseType: 'major' | 'minor' | 'patch' | 'hotfix';
  releaseDate: string | null;
  deploymentStatus: 'planned' | 'staging' | 'deployed' | 'rolled_back';
  publicationStatus: 'draft' | 'published' | 'archived';
  features: string[];
  fixes: string[];
  affectedModules: string[];
  targetScope: string;
  notes: string | null;
  createdBy: string | null;
}

const demoCatalog: ReportCatalogItem[] = [
  { key: 'institution', label: 'Institution Master & Health', description: 'Tenant onboarding, verification, lifecycle status and scale.' },
  { key: 'user', label: 'User & Access Report', description: 'Role distribution, MFA posture and verification coverage.' },
  { key: 'subscription', label: 'Subscription & Renewal', description: 'Active, trial, past-due and churned SaaS subscriptions.' },
  { key: 'revenue', label: 'Billing & Revenue Report', description: 'Invoices, taxes, discounts, collections and outstanding balances.' },
  { key: 'ai_usage', label: 'AI Usage & Credit Consumption', description: 'Provider calls, token volumes, credit debits and failures.' },
  { key: 'placement', label: 'Placement & Hiring Outcomes', description: 'Recruiters, applications, offers, placements and CTC trends.' },
  { key: 'assessment', label: 'Assessment & Exam Outcomes', description: 'Exam completions, pass rates and score aggregates.' },
  { key: 'resume', label: 'Resume Intelligence Oversight', description: 'Resume parsing success and ATS evaluation aggregates.' },
  { key: 'interview', label: 'AI Interview Usage & Performance', description: 'Session volumes, evaluation scores and latency aggregates.' },
  { key: 'support', label: 'Support & SLA Operations', description: 'Ticket backlog, priorities, SLA attainment and CSAT scores.' },
  { key: 'system', label: 'System Health & Backups', description: 'Incidents, backup completion and restore verification status.' },
];

let demoLeads: SalesLead[] = [
  {
    id: 1,
    organizationName: 'Crestwood Engineering College',
    contactName: 'Dr. Aravind Nair',
    contactEmail: 'dean@crestwood.example.edu',
    contactPhone: '+91 80 5551 2200',
    source: 'referral',
    stage: 'demo_scheduled',
    owner: { id: 900, name: 'Platform Owner' },
    interestedPlan: { id: 2, code: 'GROWTH', name: 'Growth Campus' },
    expectedStudents: 2400,
    expectedMrr: 24999,
    nextFollowUpAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    demoOutcome: null,
    lostReason: null,
    convertedOnboardingId: null,
    notes: 'Requested placement cell demo.',
    activitiesCount: 1,
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    activities: [{ id: 1, activityType: 'call', summary: 'Discovery call completed', outcome: 'Demo scheduled', occurredAt: new Date().toISOString(), actor: 'Platform Owner' }],
  },
];

let demoOnboarding: OnboardingItem[] = [
  {
    id: 1,
    leadId: null,
    institution: null,
    institutionName: 'Westlake Institute of Management',
    code: 'WESTLAKE',
    institutionType: 'institute',
    contactName: 'Priya Menon',
    contactEmail: 'it@westlake.example.edu',
    contactPhone: '+91 22 4001 9988',
    country: 'India',
    state: 'Maharashtra',
    stage: 'configuration',
    status: 'active',
    owner: { id: 900, name: 'Platform Owner' },
    targetGoLiveAt: new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10),
    blockerReason: null,
    notes: 'Batch roster imported.',
    checklist: [
      { id: 1, stage: 'new', title: 'Verify official domain & accreditation', isCompleted: true, completedAt: new Date().toISOString() },
      { id: 2, stage: 'configuration', title: 'Configure academic structure & AI wallet', isCompleted: false, completedAt: null },
    ],
    createdAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
  },
];

let demoTickets: SupportTicket[] = [
  {
    id: 1,
    ticketNumber: 'TKT-2026-0001',
    institution: { id: 2, code: 'RIVERSIDE', name: 'Riverside Institute of Technology' },
    reporter: 'Meera Kulkarni',
    assignee: { id: 900, name: 'Platform Owner' },
    subject: 'Increase monthly AI interview quota for placement boot camp',
    description: '180 students scheduled for practice interviews this week.',
    category: 'ai',
    priority: 'high',
    status: 'in_progress',
    escalationLevel: 0,
    firstResponseDueAt: new Date(Date.now() + 4 * 3_600_000).toISOString(),
    firstRespondedAt: new Date().toISOString(),
    resolutionDueAt: new Date(Date.now() + 20 * 3_600_000).toISOString(),
    resolvedAt: null,
    slaBreached: false,
    csatScore: null,
    csatComment: null,
    repliesCount: 1,
    attachmentsCount: 0,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    replies: [{ id: 1, body: 'Checking current AI wallet policy.', isInternal: true, author: 'Platform Owner', at: new Date().toISOString() }],
    attachments: [],
  },
];

let demoAnnouncements: PlatformAnnouncement[] = [
  {
    id: 1,
    title: 'Scheduled AI Rubric Engine Calibration Window',
    body: 'Rubric calibration rolls out Sunday 02:00 IST.',
    category: 'maintenance',
    priority: 'normal',
    channels: ['in_app', 'email'],
    targetScope: 'all',
    status: 'published',
    scheduledAt: null,
    publishedAt: new Date(Date.now() - 86_400_000).toISOString(),
    deliveredCount: 14,
    failedCount: 0,
    createdBy: 'Platform Owner',
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

let demoIntegrations: IntegrationItem[] = [
  {
    id: 1,
    key: 'anthropic-primary',
    name: 'Anthropic Claude API',
    category: 'ai',
    provider: 'Anthropic',
    status: 'active',
    configMasked: { endpoint: 'https://api.anthropic.com' },
    secretConfigured: true,
    lastTestedAt: new Date().toISOString(),
    lastTestStatus: 'ok',
    lastTestMessage: 'Configuration verified.',
    updatedBy: 'Platform Owner',
  },
];

let demoClients: ApiClientItem[] = [];
let demoWebhooks: WebhookItem[] = [];
let demoBackups: BackupItem[] = [
  {
    id: 1,
    backupType: 'full',
    scope: 'platform',
    institution: null,
    storageLocation: 's3://alphagrew-backups/platform/daily-full.sql.gz',
    sizeMb: 142.8,
    status: 'completed',
    verified: true,
    restoreTestedAt: new Date().toISOString(),
    restoreOutcome: 'passed',
    retentionUntil: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
    notes: 'Staging restore passed.',
    triggeredBy: 'Platform Owner',
    createdAt: new Date().toISOString(),
  },
];
let demoDataRequests: DataRequestItem[] = [];
let demoCmsPages: CmsPageItem[] = [
  {
    id: 1,
    contentType: 'policy',
    slug: 'platform-terms-of-service',
    title: 'Alpha Grew SaaS Terms of Service',
    summary: 'Tenant isolation & AI usage terms.',
    body: 'Institutions retain full data ownership.',
    seoTitle: 'Terms',
    seoDescription: 'Terms of service',
    status: 'published',
    publishedAt: new Date().toISOString(),
    currentVersion: 1,
    updatedBy: 'Platform Owner',
    revisions: [{ id: 1, versionNumber: 1, title: 'Alpha Grew SaaS Terms of Service', changeNote: 'Initial baseline', editor: 'Platform Owner', at: new Date().toISOString() }],
  },
];
let demoReleases: ProductReleaseItem[] = [
  {
    id: 1,
    version: 'v2.4.0',
    title: 'Owner Console SRS v1.0 Full Suite',
    releaseType: 'minor',
    releaseDate: new Date().toISOString().slice(0, 10),
    deploymentStatus: 'deployed',
    publicationStatus: 'published',
    features: ['Product oversight', '11 SRS reports', 'CRM & Onboarding'],
    fixes: ['MariaDB migration fix'],
    affectedModules: ['owner-console', 'reporting'],
    targetScope: 'all',
    notes: 'All modules active.',
    createdBy: 'Platform Owner',
  },
];
let demoSavedReports: SavedReport[] = [];
let demoSchedules: ReportSchedule[] = [];
let demoExports: ExportJob[] = [];

export const ownerOperationsApi = {
  // Oversight (§5.10–§5.14)
  academicOversight: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: AcademicOversight }>('/owner/oversight/academic', query).then((r) => r.data)
      : Promise.resolve<AcademicOversight>({
          totals: { institutions: 3, campuses: 3, departments: 7, courses: 12, batches: 18, academicYears: 4, semesters: 8, students: 530 },
          institutions: [{ institutionId: 1, code: 'DEFAULT', name: 'Brightnode Institute of Technology', status: 'active', campuses: 1, departments: 4, courses: 8, batches: 12, academicYears: 2, semesters: 4, students: 420, completenessPercent: 100 }],
        }),
  placementOversight: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: PlacementOversight }>('/owner/oversight/placement', query).then((r) => r.data)
      : Promise.resolve<PlacementOversight>({
          totals: { companies: 24, drives: 18, jobPostings: 32, applications: 620, shortlisted: 180, offers: 94, placements: 76, placementRatePercent: 12.3, avgCtcLpa: 7.4, maxCtcLpa: 21.5 },
          institutions: [{ institutionId: 1, code: 'DEFAULT', name: 'Brightnode Institute of Technology', companies: 20, drives: 15, applications: 540, shortlisted: 160, offers: 88, accepted: 72, avgCtcLpa: 7.6 }],
        }),
  assessmentOversight: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: AssessmentOversight }>('/owner/oversight/assessments', query).then((r) => r.data)
      : Promise.resolve<AssessmentOversight>({
          readOnlyNotice: 'Platform owner oversight exposes cross-tenant aggregates only.',
          totals: { exams: 14, scheduled: 3, ongoing: 2, completed: 9, markEntries: 1840, absentEntries: 38, passRatePercent: 91.4, avgMarks: 74.2, avgSemesterPercentage: 76.5 },
          institutions: [{ institutionId: 1, code: 'DEFAULT', name: 'Brightnode Institute of Technology', exams: 12, markEntries: 1620, passRatePercent: 92.1 }],
        }),
  resumeOversight: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: ResumeOversight }>('/owner/oversight/resumes', query).then((r) => r.data)
      : Promise.resolve<ResumeOversight>({
          privacyNotice: 'Raw student resumes and parsed PII are never exposed in owner oversight; aggregates only.',
          totals: { uploads: 310, parsed: 298, failed: 4, analyses: 280, avgOverallScore: 73.5, avgAtsScore: 76.2, aiCalls: 590, aiFailures: 4, avgLatencyMs: 920, estimatedCostUsd: 2.84 },
          institutions: [{ institutionId: 1, code: 'DEFAULT', name: 'Brightnode Institute of Technology', uploads: 260, parsed: 252, failed: 2, analyses: 240, avgOverallScore: 74.1, avgAtsScore: 77.0 }],
        }),
  interviewOversight: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: InterviewOversight }>('/owner/oversight/interviews', query).then((r) => r.data)
      : Promise.resolve<InterviewOversight>({
          disclaimer: 'AI interview evaluations are assistive readiness signals only and must not serve as autonomous hiring or academic exclusion decisions. Audio and transcripts remain private to the tenant.',
          totals: { sessions: 195, completed: 170, inProgress: 8, failed: 3, abandoned: 14, evaluated: 168, avgScore: 71.8, aiCalls: 905, aiFailures: 3, avgLatencyMs: 1180, estimatedCostUsd: 2.72 },
          byMode: { technical: 110, hr: 45, mixed: 40 },
          institutions: [{ institutionId: 1, code: 'DEFAULT', name: 'Brightnode Institute of Technology', sessions: 160, completed: 142, failed: 2, evaluated: 140, avgScore: 72.4 }],
        }),

  // Reports (§5.15 / §13)
  reportCatalog: () =>
    isApiConfigured() ? http.get<{ data: ReportCatalogItem[] }>('/owner/reports/catalog').then((r) => r.data) : Promise.resolve(demoCatalog),
  reportPreview: (query: Query) =>
    isApiConfigured()
      ? http.get<{ data: ReportPreview }>('/owner/reports/preview', query).then((r) => r.data)
      : Promise.resolve<ReportPreview>({
          key: String(query.reportKey ?? 'institution'),
          label: demoCatalog.find((c) => c.key === query.reportKey)?.label ?? 'Institution Master & Health',
          columns: ['Code', 'Institution', 'Status', 'Students'],
          rows: [['DEFAULT', 'Brightnode Institute of Technology', 'active', 420]],
          summary: { totalRows: 1 },
        }),
  savedReports: () =>
    isApiConfigured() ? http.get<{ data: SavedReport[] }>('/owner/reports/saved').then((r) => r.data) : Promise.resolve([...demoSavedReports]),
  saveReport: (input: { name: string; reportKey: string; filters?: Record<string, unknown>; format?: string }) =>
    isApiConfigured()
      ? http.post<{ data: SavedReport }>('/owner/reports/saved', input).then((r) => r.data)
      : Promise.resolve((() => { const item: SavedReport = { id: demoSavedReports.length + 1, name: input.name, reportKey: input.reportKey, filters: input.filters ?? {}, format: input.format ?? 'csv', createdBy: 'Platform Owner', lastRunAt: null }; demoSavedReports.unshift(item); return item; })()),
  deleteSavedReport: (id: number) =>
    isApiConfigured() ? http.delete(`/owner/reports/saved/${id}`) : Promise.resolve((() => { demoSavedReports = demoSavedReports.filter((r) => r.id !== id); return { message: 'Deleted' }; })()),
  reportSchedules: () =>
    isApiConfigured() ? http.get<{ data: ReportSchedule[] }>('/owner/reports/schedules').then((r) => r.data) : Promise.resolve([...demoSchedules]),
  createSchedule: (input: { name: string; reportKey: string; frequency: 'daily' | 'weekly' | 'monthly'; recipients: string[] }) =>
    isApiConfigured()
      ? http.post<{ data: ReportSchedule }>('/owner/reports/schedules', input).then((r) => r.data)
      : Promise.resolve((() => { const item: ReportSchedule = { id: demoSchedules.length + 1, ...input, format: 'csv', isActive: true, nextRunAt: new Date().toISOString(), createdBy: 'Platform Owner' }; demoSchedules.unshift(item); return item; })()),
  exportHistory: () =>
    isApiConfigured() ? http.get<{ data: ExportJob[] }>('/owner/reports/exports').then((r) => r.data) : Promise.resolve([...demoExports]),

  // CRM & Onboarding (§5.3, §5.17)
  leads: (query: Query = {}) =>
    isApiConfigured() ? http.get<{ data: SalesLead[] }>('/owner/crm/leads', query).then((r) => r.data) : Promise.resolve([...demoLeads]),
  createLead: (input: { organizationName: string; contactName: string; contactEmail: string; contactPhone?: string; source?: string; expectedStudents?: number; expectedMrr?: number; notes?: string }) =>
    isApiConfigured()
      ? http.post<{ data: SalesLead }>('/owner/crm/leads', input).then((r) => r.data)
      : Promise.resolve((() => { const item: SalesLead = { id: demoLeads.length + 1, ...input, contactPhone: input.contactPhone ?? null, source: input.source ?? 'website', stage: 'new', owner: { id: 900, name: 'Platform Owner' }, interestedPlan: null, expectedStudents: input.expectedStudents ?? null, expectedMrr: input.expectedMrr ?? null, nextFollowUpAt: null, demoOutcome: null, lostReason: null, convertedOnboardingId: null, notes: input.notes ?? null, activitiesCount: 0, createdAt: new Date().toISOString() }; demoLeads.unshift(item); return item; })()),
  updateLead: (id: number, input: { stage?: SalesLead['stage']; demoOutcome?: string; lostReason?: string; notes?: string }) =>
    isApiConfigured()
      ? http.patch<{ data: SalesLead }>(`/owner/crm/leads/${id}`, input).then((r) => r.data)
      : Promise.resolve((() => { const l = demoLeads.find((x) => x.id === id); if (!l) throw new ApiError('Not found', 404); Object.assign(l, input); return { ...l }; })()),
  leadDetail: (id: number) =>
    isApiConfigured() ? http.get<{ data: SalesLead }>(`/owner/crm/leads/${id}`).then((r) => r.data) : Promise.resolve(demoLeads.find((x) => x.id === id)!),
  addLeadActivity: (id: number, input: { activityType: string; summary: string; outcome?: string }) =>
    isApiConfigured()
      ? http.post<{ data: SalesLead }>(`/owner/crm/leads/${id}/activities`, input).then((r) => r.data)
      : Promise.resolve((() => { const l = demoLeads.find((x) => x.id === id)!; l.activities = [{ id: Date.now(), activityType: input.activityType, summary: input.summary, outcome: input.outcome ?? null, occurredAt: new Date().toISOString(), actor: 'Platform Owner' }, ...(l.activities ?? [])]; l.activitiesCount = l.activities.length; return { ...l }; })()),
  convertLead: (id: number) =>
    isApiConfigured()
      ? http.post<{ data: OnboardingItem }>(`/owner/crm/leads/${id}/convert`).then((r) => r.data)
      : Promise.resolve((() => { const l = demoLeads.find((x) => x.id === id)!; l.stage = 'won'; const onb: OnboardingItem = { id: demoOnboarding.length + 1, leadId: l.id, institution: null, institutionName: l.organizationName, code: null, institutionType: 'college', contactName: l.contactName, contactEmail: l.contactEmail, contactPhone: l.contactPhone, country: 'India', state: null, stage: 'agreement', status: 'active', owner: { id: 900, name: 'Platform Owner' }, targetGoLiveAt: null, blockerReason: null, notes: l.notes, checklist: [], createdAt: new Date().toISOString() }; l.convertedOnboardingId = onb.id; demoOnboarding.unshift(onb); return onb; })()),

  onboardingList: (query: Query = {}) =>
    isApiConfigured() ? http.get<{ data: OnboardingItem[] }>('/owner/onboarding', query).then((r) => r.data) : Promise.resolve([...demoOnboarding]),
  createOnboarding: (input: { institutionName: string; contactName: string; contactEmail: string; code?: string; institutionType?: string; state?: string }) =>
    isApiConfigured()
      ? http.post<{ data: OnboardingItem }>('/owner/onboarding', input).then((r) => r.data)
      : Promise.resolve((() => { const item: OnboardingItem = { id: demoOnboarding.length + 1, leadId: null, institution: null, institutionName: input.institutionName, code: input.code ?? null, institutionType: input.institutionType ?? 'college', contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: null, country: 'India', state: input.state ?? null, stage: 'new', status: 'active', owner: { id: 900, name: 'Platform Owner' }, targetGoLiveAt: null, blockerReason: null, notes: null, checklist: [], createdAt: new Date().toISOString() }; demoOnboarding.unshift(item); return item; })()),
  updateOnboarding: (id: number, input: { stage?: OnboardingItem['stage']; status?: OnboardingItem['status']; blockerReason?: string }) =>
    isApiConfigured()
      ? http.patch<{ data: OnboardingItem }>(`/owner/onboarding/${id}`, input).then((r) => r.data)
      : Promise.resolve((() => { const o = demoOnboarding.find((x) => x.id === id)!; Object.assign(o, input); return { ...o }; })()),
  toggleChecklist: (itemId: number) =>
    isApiConfigured()
      ? http.post<{ data: { id: number; isCompleted: boolean } }>(`/owner/onboarding/checklists/${itemId}/toggle`).then((r) => r.data)
      : Promise.resolve({ id: itemId, isCompleted: true }),
  convertOnboardingToInstitution: (id: number, input: { code?: string; status?: 'trial' | 'active' } = {}) =>
    isApiConfigured()
      ? http.post<{ data: { onboarding: OnboardingItem; institutionId: number } }>(`/owner/onboarding/${id}/convert-institution`, input).then((r) => r.data)
      : Promise.resolve((() => { const o = demoOnboarding.find((x) => x.id === id)!; o.stage = 'go_live'; o.status = 'completed'; return { onboarding: o, institutionId: 99 }; })()),

  // Support (§5.16)
  tickets: (query: Query = {}) =>
    isApiConfigured()
      ? http.get<{ data: SupportTicket[]; summary: { open: number; escalated: number; slaBreached: number; avgCsat: number | null } }>('/owner/support/tickets', query)
      : Promise.resolve({ data: [...demoTickets], summary: { open: demoTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length, escalated: 0, slaBreached: 0, avgCsat: null } }),
  createTicket: (input: { institutionId?: number | null; subject: string; description: string; category: string; priority: SupportTicket['priority'] }) =>
    isApiConfigured()
      ? http.post<{ data: SupportTicket }>('/owner/support/tickets', input).then((r) => r.data)
      : Promise.resolve((() => { const item: SupportTicket = { id: demoTickets.length + 1, ticketNumber: `TKT-2026-000${demoTickets.length + 1}`, institution: null, reporter: 'Platform Owner', assignee: { id: 900, name: 'Platform Owner' }, subject: input.subject, description: input.description, category: input.category, priority: input.priority, status: 'open', escalationLevel: 0, firstResponseDueAt: new Date(Date.now() + 4 * 3_600_000).toISOString(), firstRespondedAt: null, resolutionDueAt: new Date(Date.now() + 24 * 3_600_000).toISOString(), resolvedAt: null, slaBreached: false, csatScore: null, csatComment: null, repliesCount: 0, attachmentsCount: 0, createdAt: new Date().toISOString() }; demoTickets.unshift(item); return item; })()),
  ticketDetail: (id: number) =>
    isApiConfigured() ? http.get<{ data: SupportTicket }>(`/owner/support/tickets/${id}`).then((r) => r.data) : Promise.resolve(demoTickets.find((t) => t.id === id)!),
  updateTicket: (id: number, input: { status?: SupportTicket['status']; escalate?: boolean; csatScore?: number; csatComment?: string }) =>
    isApiConfigured()
      ? http.patch<{ data: SupportTicket }>(`/owner/support/tickets/${id}`, input).then((r) => r.data)
      : Promise.resolve((() => { const t = demoTickets.find((x) => x.id === id)!; Object.assign(t, input, input.escalate ? { status: 'escalated', escalationLevel: t.escalationLevel + 1 } : {}); return { ...t }; })()),
  replyTicket: (id: number, input: { body: string; isInternal: boolean; attachment?: File | null }) => {
    if (!isApiConfigured()) {
      const t = demoTickets.find((x) => x.id === id)!;
      t.replies = [...(t.replies ?? []), { id: Date.now(), body: input.body, isInternal: input.isInternal, author: 'Platform Owner', at: new Date().toISOString() }];
      t.repliesCount = t.replies.length;
      return Promise.resolve({ ...t });
    }
    const form = new FormData();
    form.append('body', input.body);
    form.append('isInternal', input.isInternal ? '1' : '0');
    if (input.attachment) form.append('attachment', input.attachment);
    return http.post<{ data: SupportTicket }>(`/owner/support/tickets/${id}/replies`, form).then((r) => r.data);
  },

  // Integrations, API Clients & Webhooks (§5.21)
  integrations: () =>
    isApiConfigured() ? http.get<{ data: IntegrationItem[] }>('/owner/integrations').then((r) => r.data) : Promise.resolve([...demoIntegrations]),
  saveIntegration: (input: { key: string; name: string; category: string; provider: string; status?: string; secret?: string }) =>
    isApiConfigured()
      ? http.post<{ data: IntegrationItem }>('/owner/integrations', input).then((r) => r.data)
      : Promise.resolve((() => { const item: IntegrationItem = { id: demoIntegrations.length + 1, key: input.key, name: input.name, category: input.category, provider: input.provider, status: 'active', configMasked: {}, secretConfigured: Boolean(input.secret), lastTestedAt: null, lastTestStatus: null, lastTestMessage: null, updatedBy: 'Platform Owner' }; demoIntegrations.push(item); return item; })()),
  testIntegration: (id: number) =>
    isApiConfigured()
      ? http.post<{ data: IntegrationItem }>(`/owner/integrations/${id}/test`).then((r) => r.data)
      : Promise.resolve((() => { const i = demoIntegrations.find((x) => x.id === id)!; i.lastTestStatus = 'ok'; i.lastTestMessage = 'Verified'; return { ...i }; })()),
  apiClients: () =>
    isApiConfigured() ? http.get<{ data: ApiClientItem[] }>('/owner/api-clients').then((r) => r.data) : Promise.resolve([...demoClients]),
  createApiClient: (input: { name: string; institutionId?: number | null; scopes: string[]; rateLimitPerMin?: number }) =>
    isApiConfigured()
      ? http.post<{ data: ApiClientItem; plainKey: string }>('/owner/api-clients', input)
      : Promise.resolve((() => { const item: ApiClientItem = { id: demoClients.length + 1, institution: null, name: input.name, keyPrefix: 'agk_demo1234', scopes: input.scopes, rateLimitPerMin: input.rateLimitPerMin ?? 120, status: 'active', lastUsedAt: null, expiresAt: null, createdBy: 'Platform Owner' }; demoClients.unshift(item); return { data: item, plainKey: 'agk_demo1234_secret_once' }; })()),
  revokeApiClient: (id: number) =>
    isApiConfigured()
      ? http.post<{ data: ApiClientItem }>(`/owner/api-clients/${id}/revoke`).then((r) => r.data)
      : Promise.resolve((() => { const c = demoClients.find((x) => x.id === id)!; c.status = 'revoked'; return { ...c }; })()),
  webhooks: () =>
    isApiConfigured() ? http.get<{ data: WebhookItem[] }>('/owner/webhooks').then((r) => r.data) : Promise.resolve([...demoWebhooks]),
  createWebhook: (input: { name: string; institutionId?: number | null; url: string; events: string[] }) =>
    isApiConfigured()
      ? http.post<{ data: WebhookItem }>('/owner/webhooks', input).then((r) => r.data)
      : Promise.resolve((() => { const item: WebhookItem = { id: demoWebhooks.length + 1, institution: null, name: input.name, url: input.url, events: input.events, secretMasked: 'whsec********demo', isActive: true, lastDeliveryAt: null, lastStatusCode: null, deliveries: [] }; demoWebhooks.unshift(item); return item; })()),
  testWebhook: (id: number) =>
    isApiConfigured()
      ? http.post<{ data: WebhookItem }>(`/owner/webhooks/${id}/test`).then((r) => r.data)
      : Promise.resolve(demoWebhooks.find((w) => w.id === id)!),

  // Backups & Data Governance (§5.23)
  backups: () =>
    isApiConfigured()
      ? http.get<{ data: BackupItem[]; alerts: { backupOverdue24h: boolean; unverifiedRestores: number } }>('/owner/data/backups')
      : Promise.resolve({ data: [...demoBackups], alerts: { backupOverdue24h: false, unverifiedRestores: demoBackups.filter((b) => !b.verified).length } }),
  triggerBackup: (input: { backupType: BackupItem['backupType']; scope: BackupItem['scope']; institutionId?: number | null; notes?: string }) =>
    isApiConfigured()
      ? http.post<{ data: BackupItem }>('/owner/data/backups', input).then((r) => r.data)
      : Promise.resolve((() => { const b: BackupItem = { id: demoBackups.length + 1, backupType: input.backupType, scope: input.scope, institution: null, storageLocation: 's3://alphagrew-backups/manual.sql.gz', sizeMb: 120.4, status: 'completed', verified: false, restoreTestedAt: null, restoreOutcome: null, retentionUntil: null, notes: input.notes ?? null, triggeredBy: 'Platform Owner', createdAt: new Date().toISOString() }; demoBackups.unshift(b); return b; })()),
  verifyRestore: (id: number, input: { outcome: 'passed' | 'failed'; notes?: string }) =>
    isApiConfigured()
      ? http.post<{ data: BackupItem }>(`/owner/data/backups/${id}/verify`, input).then((r) => r.data)
      : Promise.resolve((() => { const b = demoBackups.find((x) => x.id === id)!; b.verified = input.outcome === 'passed'; b.restoreOutcome = input.outcome; b.restoreTestedAt = new Date().toISOString(); return { ...b }; })()),
  dataRequests: () =>
    isApiConfigured() ? http.get<{ data: DataRequestItem[] }>('/owner/data/requests').then((r) => r.data) : Promise.resolve([...demoDataRequests]),
  createDataRequest: (input: { institutionId: number; requestType: DataRequestItem['requestType']; reason: string }) =>
    isApiConfigured()
      ? http.post<{ data: DataRequestItem }>('/owner/data/requests', input).then((r) => r.data)
      : Promise.resolve((() => { const item: DataRequestItem = { id: demoDataRequests.length + 1, institution: { id: input.institutionId, code: 'DEFAULT', name: 'Brightnode Institute of Technology' }, requestType: input.requestType, status: 'pending', reason: input.reason, requestedBy: 'Platform Owner', reviewedBy: null, reviewedAt: null, completedAt: null, createdAt: new Date().toISOString() }; demoDataRequests.unshift(item); return item; })()),
  reviewDataRequest: (id: number, input: { status: 'approved' | 'rejected' | 'completed'; confirmation?: string }) =>
    isApiConfigured()
      ? http.post<{ data: DataRequestItem }>(`/owner/data/requests/${id}/review`, input).then((r) => r.data)
      : Promise.resolve((() => { const r = demoDataRequests.find((x) => x.id === id)!; r.status = input.status; r.reviewedBy = 'Platform Owner'; return { ...r }; })()),

  // Announcements, CMS & Releases (§5.18, §5.24, §5.25)
  announcements: () =>
    isApiConfigured() ? http.get<{ data: PlatformAnnouncement[] }>('/owner/announcements').then((r) => r.data) : Promise.resolve([...demoAnnouncements]),
  createAnnouncement: (input: { title: string; body: string; category: string; priority: string; channels: string[]; targetScope: string; status: 'draft' | 'published' }) =>
    isApiConfigured()
      ? http.post<{ data: PlatformAnnouncement }>('/owner/announcements', input).then((r) => r.data)
      : Promise.resolve((() => { const item: PlatformAnnouncement = { id: demoAnnouncements.length + 1, ...input, scheduledAt: null, publishedAt: input.status === 'published' ? new Date().toISOString() : null, deliveredCount: input.status === 'published' ? 14 : 0, failedCount: 0, createdBy: 'Platform Owner', createdAt: new Date().toISOString() }; demoAnnouncements.unshift(item); return item; })()),
  updateAnnouncement: (id: number, input: { status: PlatformAnnouncement['status'] }) =>
    isApiConfigured()
      ? http.patch<{ data: PlatformAnnouncement }>(`/owner/announcements/${id}`, input).then((r) => r.data)
      : Promise.resolve((() => { const a = demoAnnouncements.find((x) => x.id === id)!; a.status = input.status; return { ...a }; })()),
  cmsPages: () =>
    isApiConfigured() ? http.get<{ data: CmsPageItem[] }>('/owner/cms/pages').then((r) => r.data) : Promise.resolve([...demoCmsPages]),
  createCmsPage: (input: { contentType: CmsPageItem['contentType']; slug: string; title: string; summary?: string; body: string; status: CmsPageItem['status'] }) =>
    isApiConfigured()
      ? http.post<{ data: CmsPageItem }>('/owner/cms/pages', input).then((r) => r.data)
      : Promise.resolve((() => { const p: CmsPageItem = { id: demoCmsPages.length + 1, ...input, summary: input.summary ?? null, seoTitle: input.title, seoDescription: null, publishedAt: input.status === 'published' ? new Date().toISOString() : null, currentVersion: 1, updatedBy: 'Platform Owner', revisions: [] }; demoCmsPages.unshift(p); return p; })()),
  updateCmsPage: (id: number, input: { title?: string; body?: string; status?: CmsPageItem['status']; changeNote?: string }) =>
    isApiConfigured()
      ? http.patch<{ data: CmsPageItem }>(`/owner/cms/pages/${id}`, input).then((r) => r.data)
      : Promise.resolve((() => { const p = demoCmsPages.find((x) => x.id === id)!; Object.assign(p, input); p.currentVersion += 1; return { ...p }; })()),
  releases: () =>
    isApiConfigured() ? http.get<{ data: ProductReleaseItem[] }>('/owner/releases').then((r) => r.data) : Promise.resolve([...demoReleases]),
  createRelease: (input: { version: string; title: string; releaseType: ProductReleaseItem['releaseType']; deploymentStatus?: ProductReleaseItem['deploymentStatus']; publicationStatus?: ProductReleaseItem['publicationStatus']; features?: string[]; notes?: string }) =>
    isApiConfigured()
      ? http.post<{ data: ProductReleaseItem }>('/owner/releases', input).then((r) => r.data)
      : Promise.resolve((() => { const r: ProductReleaseItem = { id: demoReleases.length + 1, version: input.version, title: input.title, releaseType: input.releaseType, releaseDate: new Date().toISOString().slice(0, 10), deploymentStatus: input.deploymentStatus ?? 'planned', publicationStatus: input.publicationStatus ?? 'draft', features: input.features ?? [], fixes: [], affectedModules: [], targetScope: 'all', notes: input.notes ?? null, createdBy: 'Platform Owner' }; demoReleases.unshift(r); return r; })()),
  updateRelease: (id: number, input: { deploymentStatus?: ProductReleaseItem['deploymentStatus']; publicationStatus?: ProductReleaseItem['publicationStatus'] }) =>
    isApiConfigured()
      ? http.patch<{ data: ProductReleaseItem }>(`/owner/releases/${id}`, input).then((r) => r.data)
      : Promise.resolve((() => { const r = demoReleases.find((x) => x.id === id)!; Object.assign(r, input); return { ...r }; })()),
};

export const useAcademicOversight = (query: Query = {}) => useQuery({ queryKey: ['owner', 'oversight', 'academic', query], queryFn: () => ownerOperationsApi.academicOversight(query) });
export const usePlacementOversight = (query: Query = {}) => useQuery({ queryKey: ['owner', 'oversight', 'placement', query], queryFn: () => ownerOperationsApi.placementOversight(query) });
export const useAssessmentOversight = (query: Query = {}) => useQuery({ queryKey: ['owner', 'oversight', 'assessments', query], queryFn: () => ownerOperationsApi.assessmentOversight(query) });
export const useResumeOversight = (query: Query = {}) => useQuery({ queryKey: ['owner', 'oversight', 'resumes', query], queryFn: () => ownerOperationsApi.resumeOversight(query) });
export const useInterviewOversight = (query: Query = {}) => useQuery({ queryKey: ['owner', 'oversight', 'interviews', query], queryFn: () => ownerOperationsApi.interviewOversight(query) });

export const useReportCatalog = () => useQuery({ queryKey: ['owner', 'reports', 'catalog'], queryFn: ownerOperationsApi.reportCatalog });
export const useReportPreview = (query: Query) => useQuery({ queryKey: ['owner', 'reports', 'preview', query], queryFn: () => ownerOperationsApi.reportPreview(query) });
export const useSavedReports = () => useQuery({ queryKey: ['owner', 'reports', 'saved'], queryFn: ownerOperationsApi.savedReports });
export const useReportSchedules = () => useQuery({ queryKey: ['owner', 'reports', 'schedules'], queryFn: ownerOperationsApi.reportSchedules });
export const useExportHistory = () => useQuery({ queryKey: ['owner', 'reports', 'exports'], queryFn: ownerOperationsApi.exportHistory });

export const useLeads = (query: Query = {}) => useQuery({ queryKey: ['owner', 'leads', query], queryFn: () => ownerOperationsApi.leads(query) });
export const useOnboardingList = (query: Query = {}) => useQuery({ queryKey: ['owner', 'onboarding', query], queryFn: () => ownerOperationsApi.onboardingList(query) });
export const useSupportTickets = (query: Query = {}) => useQuery({ queryKey: ['owner', 'tickets', query], queryFn: () => ownerOperationsApi.tickets(query) });
export const useTicketDetail = (id: number | null) => useQuery({ queryKey: ['owner', 'ticket', id], queryFn: () => ownerOperationsApi.ticketDetail(id!), enabled: Boolean(id) });

export const useIntegrations = () => useQuery({ queryKey: ['owner', 'integrations'], queryFn: ownerOperationsApi.integrations });
export const useApiClients = () => useQuery({ queryKey: ['owner', 'apiClients'], queryFn: ownerOperationsApi.apiClients });
export const useWebhooks = () => useQuery({ queryKey: ['owner', 'webhooks'], queryFn: ownerOperationsApi.webhooks });
export const useBackups = () => useQuery({ queryKey: ['owner', 'backups'], queryFn: ownerOperationsApi.backups });
export const useDataRequests = () => useQuery({ queryKey: ['owner', 'dataRequests'], queryFn: ownerOperationsApi.dataRequests });

export const useAnnouncements = () => useQuery({ queryKey: ['owner', 'announcements'], queryFn: ownerOperationsApi.announcements });
export const useCmsPages = () => useQuery({ queryKey: ['owner', 'cmsPages'], queryFn: ownerOperationsApi.cmsPages });
export const useProductReleases = () => useQuery({ queryKey: ['owner', 'releases'], queryFn: ownerOperationsApi.releases });

