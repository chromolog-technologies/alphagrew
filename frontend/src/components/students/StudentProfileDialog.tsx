/**
 * Staff view of one student: career profile, academic summary and education records.
 * Admins (students.edit) can also verify education records and recalculate the academic summary.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { http } from '../../api/http';
import { DOCUMENT_TYPES, documentsApi, useReviewDocument, useStudentDocuments } from '../../api/documentsApi';
import { Alert, AlertDescription, Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton } from '../ui';

interface StudentProfile {
  name: string;
  email: string;
  registrationNumber: string;
  departmentCode: string;
  headline: string | null;
  about: string | null;
  phone: string | null;
  city: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  preferredRoles: string[];
  completeness: { percent: number };
}

interface EducationRecord {
  id: number;
  level: string;
  institutionName: string | null;
  boardOrUniversity: string | null;
  yearOfPassing: number | null;
  scoreType: string | null;
  score: number | string | null;
  verified: boolean;
  verificationRemarks: string | null;
}

interface Academics {
  summary: { cgpa: number | null; activeBacklogs: number; backlogHistory: number; attendancePercentage: number | null; semestersPublished: number; calculatedAt: string | null };
  education: EducationRecord[];
}

interface StudentProfileDialogProps {
  student: { id: number; name: string } | null;
  canEdit: boolean;
  onClose: () => void;
}

export function StudentProfileDialog({ student, canEdit, onClose }: StudentProfileDialogProps) {
  const client = useQueryClient();
  const id = student?.id;
  const profile = useQuery({
    queryKey: ['student-profile', id],
    queryFn: () => http.get<{ data: StudentProfile }>(`/students/${id}/profile`).then((r) => r.data),
    enabled: Boolean(id),
  });
  const academics = useQuery({
    queryKey: ['student-academics', id],
    queryFn: () => http.get<{ data: Academics }>(`/students/${id}/academics`).then((r) => r.data),
    enabled: Boolean(id),
  });
  const refresh = () => client.invalidateQueries({ queryKey: ['student-academics', id] });
  const verify = useMutation({
    mutationFn: ({ recordId, verified }: { recordId: number; verified: boolean }) => http.post(`/students/${id}/education/${recordId}/verify`, { verified }),
    onSuccess: refresh,
  });
  const recalculate = useMutation({ mutationFn: () => http.post(`/students/${id}/academics/recalculate`), onSuccess: refresh });

  const documents = useStudentDocuments(id ?? null);
  const review = useReviewDocument();
  const error = profile.error ?? academics.error ?? verify.error ?? recalculate.error ?? review.error;
  const p = profile.data;
  const a = academics.data;

  return (
    <Dialog open={student !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student?.name}</DialogTitle>
          <DialogDescription>{p ? `${p.registrationNumber} · ${p.departmentCode} · ${p.email}` : 'Loading…'}</DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error instanceof ApiError ? error.message : 'The student could not be loaded.'}</AlertDescription>
          </Alert>
        ) : null}

        {profile.isLoading ? (
          <Skeleton className="h-24" />
        ) : p ? (
          <section className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Career profile</h3>
              <Badge variant={p.completeness.percent >= 100 ? 'success' : 'secondary'}>{p.completeness.percent}% complete</Badge>
            </div>
            {p.headline ? <p className="font-medium">{p.headline}</p> : null}
            {p.about ? <p className="text-muted-foreground">{p.about}</p> : null}
            <p className="text-muted-foreground">
              {[p.phone, p.city, p.preferredRoles.length ? `Wants: ${p.preferredRoles.join(', ')}` : null].filter(Boolean).join(' · ') || 'No details yet.'}
            </p>
            <p className="flex gap-3">
              {p.linkedinUrl ? (
                <a className="text-primary underline" href={p.linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              ) : null}
              {p.githubUrl ? (
                <a className="text-primary underline" href={p.githubUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              ) : null}
            </p>
          </section>
        ) : null}

        {academics.isLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : a ? (
          <section className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Academics</h3>
              {canEdit ? (
                <Button type="button" variant="outline" size="sm" className="gap-1" disabled={recalculate.isPending} onClick={() => recalculate.mutate()}>
                  <RefreshCw size={13} /> Recalculate
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="CGPA" value={a.summary.cgpa ?? '—'} />
              <Stat label="Active backlogs" value={a.summary.activeBacklogs} />
              <Stat label="Backlog history" value={a.summary.backlogHistory} />
              <Stat label="Attendance" value={a.summary.attendancePercentage !== null ? `${a.summary.attendancePercentage}%` : '—'} />
            </div>

            <h4 className="font-medium">Education</h4>
            {a.education.length === 0 ? (
              <p className="text-muted-foreground">No education records.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Education records">
                {a.education.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>
                      <span className="font-medium uppercase">{e.level.replace('_', ' ')}</span> · {e.institutionName ?? e.boardOrUniversity ?? '—'}
                      {e.yearOfPassing ? ` · ${e.yearOfPassing}` : ''}
                      {e.score !== null ? ` · ${e.score}${e.scoreType === 'percentage' ? '%' : ''}` : ''}
                    </span>
                    {e.verified ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 size={12} /> Verified
                      </Badge>
                    ) : canEdit ? (
                      <Button type="button" size="sm" variant="outline" disabled={verify.isPending} onClick={() => verify.mutate({ recordId: e.id, verified: true })}>
                        Verify
                      </Button>
                    ) : (
                      <Badge variant="secondary">Not verified</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="mt-4 space-y-2 text-sm">
          <h3 className="font-semibold">Documents</h3>
          {(documents.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">No documents uploaded.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Documents">
              {(documents.data ?? []).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span>
                    {d.title} <span className="text-xs text-muted-foreground">({DOCUMENT_TYPES.find((t) => t.value === d.type)?.label})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge variant={d.status === 'verified' ? 'success' : d.status === 'rejected' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                    <Button type="button" variant="ghost" size="sm" onClick={() => documentsApi.open(d.id)}>
                      Open
                    </Button>
                    {canEdit && d.status === 'pending' ? (
                      <>
                        <Button type="button" variant="outline" size="sm" aria-label={`Verify ${d.title}`} onClick={() => review.mutate({ id: d.id, status: 'verified' })}>
                          Verify
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Reject ${d.title}`}
                          onClick={() => {
                            const remarks = window.prompt('Why is this document rejected?');
                            if (remarks?.trim()) review.mutate({ id: d.id, status: 'rejected', remarks: remarks.trim() });
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
