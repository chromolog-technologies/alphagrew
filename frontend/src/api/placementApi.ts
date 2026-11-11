/**
 * Placement on the job-posting model (PRD v1.1 §6, §10): jobs with eligibility rules, the
 * application pipeline, rounds and offers. Students: /students/me/*; officers: /placement/*.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export type JobStatus = 'draft' | 'open' | 'closed';
export type EmploymentType = 'full_time' | 'internship' | 'ppo';
export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'in_rounds'
  | 'selected'
  | 'offered'
  | 'placed'
  | 'rejected'
  | 'withdrawn'
  | 'offer_declined'
  | 'offer_expired';

export type RuleField =
  | 'cgpa'
  | 'active_backlogs'
  | 'backlog_history'
  | 'attendance_percentage'
  | 'department'
  | 'year'
  | 'batch'
  | 'class_10_score'
  | 'class_12_score'
  | 'skill'
  | 'profile_completion';
export type RuleOperator = 'gte' | 'lte' | 'eq' | 'in' | 'not_in';

export interface EligibilityRule {
  field: RuleField;
  operator: RuleOperator;
  value: number | string[] | { skillId: number; minLevel: number };
  label?: string;
}

export interface RuleResult {
  field: RuleField;
  label: string;
  operator: RuleOperator;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface Blocker {
  code: string;
  message: string;
}

export interface Assessment {
  eligible: boolean;
  canApply: boolean;
  rules: RuleResult[];
  blockers: Blocker[];
}

export interface ApplicationEvent {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note: string | null;
  actor: string | null;
  at: string;
}

export interface Offer {
  ctcLpa: number | null;
  offeredAt: string;
  respondBy: string | null;
  respondedAt: string | null;
  note: string | null;
}

export interface Application {
  id: number;
  jobId: number;
  status: ApplicationStatus;
  statusLabel: string;
  allowedNext: ApplicationStatus[];
  appliedAt: string;
  decidedAt: string | null;
  withdrawnAt: string | null;
  offer: Offer | null;
  eligibilitySnapshot?: { evaluatedAt: string; rules: RuleResult[] } | null;
  student?: { id: number; name: string; registrationNumber: string; departmentCode: string; year: string; cgpa: number | null; email: string } | null;
  job?: { id: number; title: string; company: string | null; packageDisplay: string | null; status: JobStatus };
  events?: ApplicationEvent[];
  roundResults?: { roundId: number; round: string | null; status: RoundResultStatus; score: number | null; feedback: string | null }[];
}

export interface Job {
  id: number;
  title: string;
  description: string | null;
  employmentType: EmploymentType;
  location: string | null;
  ctcMinLpa: number | null;
  ctcMaxLpa: number | null;
  stipendMonthly: number | null;
  packageDisplay: string | null;
  openings: number | null;
  requiredSkills: string[];
  applyDeadline: string | null;
  driveDate: string | null;
  status: JobStatus;
  isOpen: boolean;
  publishedAt: string | null;
  company: { id: number; name: string; industry: string | null; website: string | null; logoUrl: string | null } | null;
  eligibility?: EligibilityRule[];
  assessment?: Assessment;
  application?: Application;
  counts?: Record<ApplicationStatus | 'total', number>;
}

export interface PlacementState {
  optedOut: boolean;
  debarredUntil: string | null;
  debarReason: string | null;
  placedAt: string | null;
  policy: {
    oneOfferRule: boolean;
    dreamOfferEnabled: boolean;
    dreamOfferMinCtc: number | null;
    maxActiveApplications: number | null;
    minProfileCompletion: number;
    offerResponseDays: number;
  };
}

export interface JobInput {
  companyId?: number | null;
  companyName?: string;
  industry?: string | null;
  website?: string | null;
  title: string;
  description?: string | null;
  employmentType: EmploymentType;
  location?: string | null;
  ctcMinLpa?: number | null;
  ctcMaxLpa?: number | null;
  stipendMonthly?: number | null;
  openings?: number | null;
  requiredSkills?: string[];
  applyDeadline?: string | null;
  driveDate?: string | null;
  eligibility?: EligibilityRule[];
}

export interface EligibleStudentRow {
  id: number;
  name: string;
  registrationNumber: string;
  departmentCode: string;
  year: string;
  cgpa: number | null;
  eligible: boolean;
  canApply: boolean;
  failedRules: RuleResult[];
  blockers: Blocker[];
  applicationStatus: ApplicationStatus | null;
}

export type RoundType = 'aptitude' | 'technical' | 'coding' | 'group_discussion' | 'interview' | 'hr' | 'other';
export type RoundResultStatus = 'passed' | 'failed' | 'absent';

export interface Round {
  id: number;
  jobId: number;
  sequence: number;
  name: string;
  type: RoundType;
  scheduledAt: string | null;
  durationMinutes: number | null;
  description: string | null;
  results: { applicationId: number; studentId: number; status: RoundResultStatus; score: number | null; feedback: string | null }[];
}

export interface RoundInput {
  name: string;
  type: RoundType;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  description?: string | null;
}

/** Labels and colours shared by every placement screen. */
export const APPLICATION_STATUS: Record<ApplicationStatus, { label: string; tone: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' }> = {
  applied: { label: 'Applied', tone: 'secondary' },
  shortlisted: { label: 'Shortlisted', tone: 'info' },
  in_rounds: { label: 'In rounds', tone: 'info' },
  selected: { label: 'Selected', tone: 'default' },
  offered: { label: 'Offer made', tone: 'warning' },
  placed: { label: 'Placed', tone: 'success' },
  rejected: { label: 'Not selected', tone: 'destructive' },
  withdrawn: { label: 'Withdrawn', tone: 'secondary' },
  offer_declined: { label: 'Offer declined', tone: 'secondary' },
  offer_expired: { label: 'Offer expired', tone: 'destructive' },
};

export const EMPLOYMENT_TYPES: Record<EmploymentType, string> = { full_time: 'Full time', internship: 'Internship', ppo: 'Internship + PPO' };

export const ROUND_TYPES: Record<RoundType, string> = {
  aptitude: 'Aptitude test',
  technical: 'Technical',
  coding: 'Coding',
  group_discussion: 'Group discussion',
  interview: 'Interview',
  hr: 'HR',
  other: 'Other',
};

/** Rule fields the editor offers, with the operators the backend accepts for each. */
export const RULE_FIELDS: Record<Exclude<RuleField, 'skill'>, { label: string; operators: RuleOperator[]; kind: 'number' | 'list' }> = {
  cgpa: { label: 'CGPA', operators: ['gte', 'lte'], kind: 'number' },
  active_backlogs: { label: 'Active backlogs', operators: ['lte', 'eq'], kind: 'number' },
  backlog_history: { label: 'Backlog history', operators: ['lte', 'eq'], kind: 'number' },
  attendance_percentage: { label: 'Attendance %', operators: ['gte'], kind: 'number' },
  department: { label: 'Department', operators: ['in', 'not_in'], kind: 'list' },
  year: { label: 'Year of study', operators: ['in', 'not_in'], kind: 'list' },
  batch: { label: 'Batch (code or graduation year)', operators: ['in'], kind: 'list' },
  class_10_score: { label: 'Class 10 score % (verified)', operators: ['gte'], kind: 'number' },
  class_12_score: { label: 'Class 12 score % (verified)', operators: ['gte'], kind: 'number' },
  profile_completion: { label: 'Profile completion %', operators: ['gte'], kind: 'number' },
};

export const OPERATOR_LABELS: Record<RuleOperator, string> = { gte: 'at least', lte: 'at most', eq: 'exactly', in: 'is one of', not_in: 'is not' };

export const placementApi = {
  // Student
  myJobs: () => http.get<{ data: Job[]; placement: PlacementState }>('/students/me/jobs'),
  apply: (jobId: number) => http.post<{ data: Application }>(`/students/me/jobs/${jobId}/apply`),
  myApplications: () => http.get<{ data: Application[] }>('/students/me/applications').then((response) => response.data),
  withdraw: (applicationId: number, reason?: string) =>
    http.post<{ data: Application }>(`/students/me/applications/${applicationId}/withdraw`, { reason }),
  respondToOffer: (applicationId: number, accept: boolean) =>
    http.post<{ data: Application }>(`/students/me/applications/${applicationId}/offer/${accept ? 'accept' : 'decline'}`),
  setOptOut: (optedOut: boolean) => http.put<{ data: PlacementState }>('/students/me/placement-preference', { optedOut }),

  // Officer
  jobs: () => http.get<{ data: Job[]; companies: { id: number; name: string; industry: string | null; website: string | null }[] }>('/placement/jobs'),
  job: (id: number) => http.get<{ data: Job }>(`/placement/jobs/${id}`).then((response) => response.data),
  createJob: (input: JobInput) => http.post<{ data: Job }>('/placement/jobs', input).then((response) => response.data),
  updateJob: (id: number, input: JobInput) => http.patch<{ data: Job }>(`/placement/jobs/${id}`, input).then((response) => response.data),
  deleteJob: (id: number) => http.delete<{ message: string }>(`/placement/jobs/${id}`),
  publish: (id: number) => http.post<{ data: Job; notified: number }>(`/placement/jobs/${id}/publish`),
  close: (id: number) => http.post<{ data: Job }>(`/placement/jobs/${id}/close`),
  preview: (eligibility: EligibilityRule[]) =>
    http.post<{ data: { total: number; eligible: number; excludedByRule: number[] } }>('/placement/eligibility/preview', { eligibility }).then((response) => response.data),
  eligibleStudents: (id: number) =>
    http.get<{ data: EligibleStudentRow[]; summary: { total: number; eligible: number; applied: number } }>(`/placement/jobs/${id}/eligible-students`),
  applications: (id: number) => http.get<{ data: Application[] }>(`/placement/jobs/${id}/applications`).then((response) => response.data),
  moveApplications: (applicationIds: number[], status: ApplicationStatus, note?: string) =>
    http.post<{ data: Application[] }>('/placement/applications/status', { applicationIds, status, note }),
  offer: (applicationId: number, input: { ctcLpa?: number | null; respondBy?: string | null; note?: string | null }) =>
    http.post<{ data: Application }>(`/placement/applications/${applicationId}/offer`, input),
  rounds: (id: number) => http.get<{ data: Round[] }>(`/placement/jobs/${id}/rounds`).then((response) => response.data),
  createRound: (jobId: number, input: RoundInput) => http.post<{ data: Round }>(`/placement/jobs/${jobId}/rounds`, input),
  recordResults: (roundId: number, results: { applicationId: number; status: RoundResultStatus; score?: number | null; feedback?: string | null }[]) =>
    http.put<{ data: Round }>(`/placement/rounds/${roundId}/results`, { results }),
  debar: (studentId: number, until: string, reason: string) => http.post(`/placement/students/${studentId}/debar`, { until, reason }),
  lift: (studentId: number) => http.delete(`/placement/students/${studentId}/debar`),
};

export const placementKeys = {
  all: ['placement'] as const,
  myJobs: ['placement', 'my-jobs'] as const,
  myApplications: ['placement', 'my-applications'] as const,
  jobs: ['placement', 'jobs'] as const,
  job: (id: number) => ['placement', 'job', id] as const,
  eligible: (id: number) => ['placement', 'job', id, 'eligible'] as const,
  applications: (id: number) => ['placement', 'job', id, 'applications'] as const,
  rounds: (id: number) => ['placement', 'job', id, 'rounds'] as const,
};

export const useMyJobs = () => useQuery({ queryKey: placementKeys.myJobs, queryFn: placementApi.myJobs });
export const useMyApplications = () => useQuery({ queryKey: placementKeys.myApplications, queryFn: placementApi.myApplications });
export const usePlacementJobs = () => useQuery({ queryKey: placementKeys.jobs, queryFn: placementApi.jobs });
export const useEligibleStudents = (id: number | null) =>
  useQuery({ queryKey: placementKeys.eligible(id ?? 0), queryFn: () => placementApi.eligibleStudents(id!), enabled: id !== null });
export const useJobApplications = (id: number | null) =>
  useQuery({ queryKey: placementKeys.applications(id ?? 0), queryFn: () => placementApi.applications(id!), enabled: id !== null });
export const useJobRounds = (id: number | null) =>
  useQuery({ queryKey: placementKeys.rounds(id ?? 0), queryFn: () => placementApi.rounds(id!), enabled: id !== null });

/** Any placement mutation refreshes every placement query. */
export function usePlacementMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: placementKeys.all });
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
