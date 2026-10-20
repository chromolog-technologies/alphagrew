/**
 * Marks and results workflow (Campus Academics addendum, A5):
 * grade rules + mark schemes → marks entered as draft → submitted → verified → approved
 * → semester published (entries locked, semester results created) → unlock with a reason.
 *
 * Entry states: draft → submitted → verified → approved → locked. Reject returns an entry to
 * draft; unlock returns locked entries to approved.
 */
import { apiCall } from './apiClient';

export type MarkEntryStatus = 'new' | 'draft' | 'submitted' | 'verified' | 'approved' | 'locked';

export interface Semester {
  id: number;
  name: string;
  semester_number: number;
  academic_year?: { id: number; name: string } | null;
}

export interface SubjectSummary {
  id: number;
  name: string;
  code: string;
}

export interface GradeRule {
  id: number;
  min_score: number;
  max_score: number;
  grade: string;
  gpa: number;
  description?: string | null;
  sort_order: number;
}

export interface MarkScheme {
  id: number;
  subject_id: number;
  semester_id: number;
  internal_marks: number;
  external_marks: number;
  total_marks: number;
  pass_mark: number;
  extra_marks_allowed: number;
  is_active: boolean;
  subject?: SubjectSummary;
}

export interface Exam {
  id: number;
  name: string;
  subject_id: number;
  semester_id: number;
  exam_date: string;
  max_marks: number;
  status: string;
  subject?: SubjectSummary;
  exam_type?: { id: number; name: string } | null;
}

export interface EntryStudent {
  id: number;
  name: string;
  email: string;
  registration_number: string;
  entry_id: number | null;
  internal_marks: number | null;
  external_marks: number | null;
  extra_marks: number | null;
  is_absent: boolean;
  status: MarkEntryStatus;
  total_marks: number | null;
  grade: string | null;
  result: string | null;
}

export interface EntrySheet {
  mark_scheme: MarkScheme;
  students: EntryStudent[];
  exam: Exam;
}

export interface MarkInput {
  student_id: number;
  exam_id: number;
  subject_id: number;
  mark_scheme_id: number;
  internal_marks: number | null;
  external_marks: number | null;
  extra_marks: number | null;
  is_absent: boolean;
}

export interface ReviewEntry {
  id: number;
  status: MarkEntryStatus;
  internal_marks: number | null;
  external_marks: number | null;
  extra_marks: number | null;
  total_marks: number | null;
  grade: string | null;
  result: string | null;
  is_absent: boolean;
  remarks: string | null;
  exam?: { id: number; name: string } | null;
  subject?: SubjectSummary | null;
  student?: { id: number; name: string; registration_number: string } | null;
  /** The loaded enteredBy relation (serialised over the entered_by id column). */
  entered_by?: { id: number; name: string } | number | null;
}

export interface Paginated<T> {
  current_page: number;
  last_page: number;
  total: number;
  data: T[];
}

export interface ReviewQueue {
  entries: Paginated<ReviewEntry>;
  stats: { total_entries: number; submitted: number; verified: number; approved: number };
}

export interface MarkStats {
  total_entries: number;
  draft: number;
  submitted: number;
  verified: number;
  approved: number;
}

export interface PublishingStatus {
  semester: Semester;
  mark_stats: MarkStats;
  published_results_count: number;
  can_publish: boolean;
  ready_percentage: number;
}

export interface PublishingLog {
  id: number;
  action: 'publish' | 'unlock';
  details: string | null;
  total_students: number;
  students_published: number;
  published_at: string;
  /** The loaded publishedBy relation; Laravel serialises it over the published_by id column. */
  published_by?: { id: number; name: string } | number | null;
}

/** Name of a relation that may come back as an object or, when not loaded, as its id. */
export function relationName(value: { name: string } | number | null | undefined): string | null {
  return value && typeof value === 'object' ? value.name : null;
}

export interface PublishedSemesterResult {
  semester_id: number;
  semester_name: string;
  total_subjects: number;
  subjects_passed: number;
  subjects_failed: number;
  percentage: number;
  overall_grade: string | null;
  gpa: number;
  result: string;
  published_at: string;
}

export interface StudentResults {
  semesters: PublishedSemesterResult[];
  cumulative: {
    total_semesters: number;
    total_subjects_passed: number;
    total_subjects_failed: number;
    cumulative_gpa: number;
    overall_result: 'PASS' | 'FAIL';
  };
}

export interface SemesterResultDetail {
  semester: Semester;
  marks: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    internal_marks: number | null;
    external_marks: number | null;
    extra_marks: number | null;
    total_marks: number | null;
    grade: string | null;
    result: string | null;
    is_absent: boolean;
  }[];
  summary: { percentage: number; overall_grade: string | null; gpa: number; result: string; grand_total: number };
  published_at: string;
}

/**
 * Locked entries are counted in total_entries but in no status bucket of mark_stats.
 * Publishing is allowed only when every remaining entry is approved (the backend refuses otherwise,
 * even when its own can_publish flag is true with verified entries left).
 */
export function publishReadiness(stats: MarkStats) {
  const pending = stats.draft + stats.submitted + stats.verified;
  const locked = Math.max(0, stats.total_entries - pending - stats.approved);

  return { pending, locked, canPublish: stats.total_entries > 0 && pending === 0 && stats.approved > 0 };
}

const unwrap = <T>(response: { data: T }) => response.data;

export const marksApi = {
  semesters: (): Promise<Semester[]> => apiCall('/semesters'),

  gradeRules: (): Promise<GradeRule[]> => apiCall('/grade-rules').then(unwrap<GradeRule[]>),
  setupDefaultGradeRules: (): Promise<GradeRule[]> =>
    apiCall('/grade-rules/setup-defaults', 'POST').then(unwrap<GradeRule[]>),
  createGradeRule: (rule: Omit<GradeRule, 'id'>) => apiCall('/grade-rules', 'POST', rule),
  deleteGradeRule: (id: number) => apiCall(`/grade-rules/${id}`, 'DELETE'),

  markSchemes: (semesterId: number): Promise<MarkScheme[]> =>
    apiCall(`/mark-schemes?semester_id=${semesterId}`).then((response) => response.data.data as MarkScheme[]),
  semesterSubjects: (semesterId: number): Promise<SubjectSummary[]> =>
    apiCall(`/mark-schemes/semester/${semesterId}/subjects`).then(unwrap<SubjectSummary[]>),
  createMarkScheme: (scheme: Omit<MarkScheme, 'id' | 'subject' | 'is_active'>) => apiCall('/mark-schemes', 'POST', scheme),
  deleteMarkScheme: (id: number) => apiCall(`/mark-schemes/${id}`, 'DELETE'),

  exams: (semesterId: number): Promise<Exam[]> => apiCall(`/exams?semester_id=${semesterId}`).then(unwrap<Exam[]>),

  entrySheet: (examId: number, subjectId: number): Promise<EntrySheet> =>
    apiCall('/mark-entries/get-students', 'POST', { exam_id: examId, subject_id: subjectId }).then(unwrap<EntrySheet>),
  saveDraft: (marks: MarkInput[]) => apiCall('/mark-entries/save-draft', 'POST', { marks }),
  submit: (examId: number, subjectId: number): Promise<{ submitted_count: number }> =>
    apiCall('/mark-entries/submit', 'POST', { exam_id: examId, subject_id: subjectId }).then(
      unwrap<{ submitted_count: number }>,
    ),

  reviewQueue: (status: MarkEntryStatus | 'all', page: number): Promise<ReviewQueue> => {
    const params = new URLSearchParams({ page: String(page) });
    if (status !== 'all') params.append('status', status);
    return apiCall(`/mark-review/submitted?${params.toString()}`).then((response) => ({
      entries: response.data as Paginated<ReviewEntry>,
      stats: response.stats,
    }));
  },
  verify: (entryId: number, remarks?: string) => apiCall(`/mark-review/${entryId}/verify`, 'POST', { remarks }),
  approve: (entryId: number) => apiCall(`/mark-review/${entryId}/approve`, 'POST'),
  reject: (entryId: number, reason: string) => apiCall(`/mark-review/${entryId}/reject`, 'POST', { reason }),

  publishingStatus: (semesterId: number): Promise<PublishingStatus> =>
    apiCall(`/result-publishing/status?semester_id=${semesterId}`).then(unwrap<PublishingStatus>),
  publish: (semesterId: number): Promise<{ published_count: number; message: string }> =>
    apiCall('/result-publishing/publish', 'POST', { semester_id: semesterId }),
  unlock: (semesterId: number, reason: string) =>
    apiCall('/result-publishing/unlock', 'POST', { semester_id: semesterId, reason }),
  publishingLogs: (semesterId: number): Promise<PublishingLog[]> =>
    apiCall(`/result-publishing/logs?semester_id=${semesterId}`).then((response) => response.data.data as PublishingLog[]),

  myResults: (): Promise<StudentResults> => apiCall('/student/results/all').then(unwrap<StudentResults>),
  mySemesterResult: (semesterId: number): Promise<SemesterResultDetail> =>
    apiCall(`/student/results/semester/${semesterId}`).then(unwrap<SemesterResultDetail>),
};
