/** Materials and assignments per subject: faculty post and grade; students see their subjects and submit. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface LmsMaterial {
  id: number;
  subjectId: number;
  title: string;
  description: string | null;
  linkUrl: string | null;
  hasFile: boolean;
  originalName: string | null;
  createdAt: string | null;
}

export interface LmsSubmission {
  id: number;
  assignmentId: number;
  studentId: number;
  textAnswer: string | null;
  hasFile: boolean;
  originalName: string | null;
  submittedAt: string | null;
  isLate: boolean;
  marks: number | null;
  feedback: string | null;
  gradedAt: string | null;
  student?: { id: number; name: string; registration_number: string } | null;
}

export interface LmsAssignment {
  id: number;
  subjectId: number;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  maxMarks: number;
  allowLate: boolean;
  isOpen: boolean;
  submissions?: number;
  mySubmission?: LmsSubmission | null;
}

export interface LmsSubjectContent {
  subject: { id: number; code: string; name: string };
  canTeach: boolean;
  materials: LmsMaterial[];
  assignments: LmsAssignment[];
}

export const lmsApi = {
  teaching: () => http.get<{ data: { id: number; code: string; name: string }[] }>('/lms/teaching').then((r) => r.data),
  mySubjects: () => http.get<{ data: { id: number; code: string; name: string; materials: number; openAssignments: number }[] }>('/lms/my-subjects').then((r) => r.data),
  subject: (id: number) => http.get<{ data: LmsSubjectContent }>(`/lms/subjects/${id}`).then((r) => r.data),
  addMaterial: (subjectId: number, input: { title: string; description?: string; linkUrl?: string; file?: File | null }) => {
    const body = new FormData();
    body.append('title', input.title);
    if (input.description) body.append('description', input.description);
    if (input.linkUrl) body.append('linkUrl', input.linkUrl);
    if (input.file) body.append('file', input.file);
    return http.post(`/lms/subjects/${subjectId}/materials`, body);
  },
  removeMaterial: (id: number) => http.delete(`/lms/materials/${id}`),
  addAssignment: (subjectId: number, input: { title: string; instructions?: string; dueAt: string; maxMarks: number; allowLate: boolean }) =>
    http.post(`/lms/subjects/${subjectId}/assignments`, input),
  removeAssignment: (id: number) => http.delete(`/lms/assignments/${id}`),
  submissions: (assignmentId: number) => http.get<{ data: LmsSubmission[] }>(`/lms/assignments/${assignmentId}/submissions`).then((r) => r.data),
  grade: (submissionId: number, marks: number, feedback?: string) => http.post(`/lms/submissions/${submissionId}/grade`, { marks, feedback }),
  submit: (assignmentId: number, input: { textAnswer?: string; file?: File | null }) => {
    const body = new FormData();
    if (input.textAnswer) body.append('textAnswer', input.textAnswer);
    if (input.file) body.append('file', input.file);
    return http.post(`/lms/assignments/${assignmentId}/submit`, body);
  },
  /** Opens a material or submission file through a five-minute signed link. */
  open: async (kind: 'material' | 'submission', id: number) => {
    const { data } = await http.get<{ data: { url: string } }>(`/lms/files/${kind}/${id}/link`);
    window.open(data.url, '_blank', 'noopener');
  },
};

export const useTeachingSubjects = () => useQuery({ queryKey: ['lms', 'teaching'], queryFn: lmsApi.teaching });
export const useMyLmsSubjects = () => useQuery({ queryKey: ['lms', 'my-subjects'], queryFn: lmsApi.mySubjects });
export const useLmsSubject = (id: number | null) => useQuery({ queryKey: ['lms', 'subject', id], queryFn: () => lmsApi.subject(id as number), enabled: id !== null });
export const useSubmissions = (assignmentId: number | null) =>
  useQuery({ queryKey: ['lms', 'submissions', assignmentId], queryFn: () => lmsApi.submissions(assignmentId as number), enabled: assignmentId !== null });

export function useLmsMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: ['lms'] }) });
}
