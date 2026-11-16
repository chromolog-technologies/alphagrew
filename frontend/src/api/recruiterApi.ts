/**
 * Recruiter portal: recruiters see their company's jobs and the candidates the placement office
 * has shortlisted, and leave feedback. The placement office manages recruiter accounts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface RecruiterJob {
  id: number;
  title: string;
  location: string | null;
  employmentType: string | null;
  status: string;
  packageDisplay: string | null;
  openings: number | null;
  sharedCandidates: number;
}

export interface RecruiterCandidate {
  applicationId: number;
  status: string;
  student: { name: string; registrationNumber: string; department: string; year: string; cgpa: number | null };
  feedback: { note: string; at: string | null }[];
}

export interface RecruiterAccount {
  id: number;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
}

export type RecruiterDecision = 'recommend' | 'hold' | 'reject';

export const recruiterApi = {
  jobs: () => http.get<{ data: RecruiterJob[]; meta: { company: { id: number; name: string } } }>('/recruiter/jobs'),
  candidates: (jobId: number) => http.get<{ data: RecruiterCandidate[] }>(`/recruiter/jobs/${jobId}/candidates`).then((r) => r.data),
  feedback: (applicationId: number, decision: RecruiterDecision, note?: string) =>
    http.post(`/recruiter/applications/${applicationId}/feedback`, { decision, note }),
  accounts: (companyId: number) => http.get<{ data: RecruiterAccount[] }>(`/companies/${companyId}/recruiters`).then((r) => r.data),
  invite: (companyId: number, input: { name: string; email: string }) =>
    http.post<{ data: { id: number; emailSent: boolean } }>(`/companies/${companyId}/recruiters`, input).then((r) => r.data),
  remove: (companyId: number, recruiterId: number) => http.delete(`/companies/${companyId}/recruiters/${recruiterId}`),
};

export const useRecruiterJobs = () => useQuery({ queryKey: ['recruiter', 'jobs'], queryFn: recruiterApi.jobs });
export const useRecruiterCandidates = (jobId: number | null) =>
  useQuery({ queryKey: ['recruiter', 'candidates', jobId], queryFn: () => recruiterApi.candidates(jobId as number), enabled: jobId !== null });
export const useRecruiterAccounts = (companyId: number | null) =>
  useQuery({ queryKey: ['recruiter', 'accounts', companyId], queryFn: () => recruiterApi.accounts(companyId as number), enabled: companyId !== null });

export function useRecruiterMutation<TArgs, TResult = unknown>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: ['recruiter'] }) });
}
