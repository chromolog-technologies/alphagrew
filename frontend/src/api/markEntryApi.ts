/**
 * Faculty mark entry on the results workflow: pick one of your exams, load the class roster,
 * save marks as draft, then submit them for departmental review.
 *
 * GET /exams?mine=1 → GET /mark-entries/get-students → POST /mark-entries/save-draft → POST /mark-entries/submit
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export type EntryStatus = 'draft' | 'submitted' | 'verified' | 'approved' | 'locked';

/** GET /exams returns database columns (snake_case). */
export interface MyExam {
  id: number;
  name: string;
  subject_id: number;
  semester_id: number;
  exam_date: string;
  max_marks: number;
  status: 'scheduled' | 'conducted' | 'cancelled' | 'postponed';
  subject: { id: number; name: string; code: string } | null;
  exam_type: { id: number; name: string } | null;
  semester: { id: number; name: string; is_active: boolean } | null;
}

export interface RosterScheme {
  id: number;
  internalMax: number;
  externalMax: number;
  totalMax: number;
  internalPass: number;
  externalPass: number;
  totalPass: number;
  extraMarksAllowed: number;
}

export interface RosterEntry {
  id: number;
  internalMarks: number | null;
  externalMarks: number | null;
  extraMarks: number | null;
  totalMarks: number | null;
  grade: string | null;
  result: string | null;
  isAbsent: boolean;
  status: EntryStatus;
  remarks: string | null;
}

export interface RosterStudent {
  id: number;
  name: string;
  registrationNumber: string;
  entry: RosterEntry | null;
}

export interface Roster {
  exam: { id: number; name: string; semesterId: number };
  subject: { id: number; code: string; name: string; credits: number };
  markScheme: RosterScheme;
  students: RosterStudent[];
}

export interface DraftRow {
  studentId: number;
  internalMarks: number | null;
  externalMarks: number | null;
  extraMarks: number | null;
  isAbsent: boolean;
}

export const markEntryApi = {
  myExams: () => http.get<{ data: MyExam[] }>('/exams', { mine: 1 }).then((response) => response.data),
  roster: (examId: number, subjectId: number) =>
    http.get<{ data: Roster }>('/mark-entries/get-students', { examId, subjectId }).then((response) => response.data),
  saveDraft: (examId: number, subjectId: number, entries: DraftRow[]) =>
    http.post<{ data: { savedCount: number }; message: string }>('/mark-entries/save-draft', { examId, subjectId, entries }),
  submit: (examId: number, subjectId: number) =>
    http.post<{ data: { submittedCount: number }; message: string }>('/mark-entries/submit', {
      examId,
      subjectId,
      declarationConfirmed: true,
    }),
};

export const markEntryKeys = {
  myExams: ['mark-entry', 'my-exams'] as const,
  roster: (examId: number, subjectId: number) => ['mark-entry', 'roster', examId, subjectId] as const,
};

export function useMyExams(enabled = true) {
  return useQuery({ queryKey: markEntryKeys.myExams, queryFn: markEntryApi.myExams, enabled });
}

export function useRoster(exam: MyExam | null) {
  return useQuery({
    queryKey: markEntryKeys.roster(exam?.id ?? 0, exam?.subject_id ?? 0),
    queryFn: () => markEntryApi.roster(exam!.id, exam!.subject_id),
    enabled: exam !== null,
    retry: false,
  });
}

export function useSaveDraft(exam: MyExam | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entries: DraftRow[]) => markEntryApi.saveDraft(exam!.id, exam!.subject_id, entries),
    onSuccess: () => client.invalidateQueries({ queryKey: markEntryKeys.roster(exam!.id, exam!.subject_id) }),
  });
}

export function useSubmitMarks(exam: MyExam | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => markEntryApi.submit(exam!.id, exam!.subject_id),
    onSuccess: () => client.invalidateQueries({ queryKey: markEntryKeys.roster(exam!.id, exam!.subject_id) }),
  });
}
