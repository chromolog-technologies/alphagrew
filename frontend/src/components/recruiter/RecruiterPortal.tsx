/** Recruiters: their company's jobs, the candidates shared with them, and feedback per candidate. */
import { useEffect, useState } from 'react';
import { ApiError } from '../../api/apiError';
import { recruiterApi, useRecruiterCandidates, useRecruiterJobs, useRecruiterMutation, type RecruiterDecision } from '../../api/recruiterApi';
import { Alert, AlertDescription, Badge, Button, Card, Input, Select, Skeleton } from '../ui';

const DECISIONS: { value: RecruiterDecision; label: string }[] = [
  { value: 'recommend', label: 'Recommend' },
  { value: 'hold', label: 'Hold' },
  { value: 'reject', label: 'Not a fit' },
];

export function RecruiterPortal() {
  const jobs = useRecruiterJobs();
  const [jobId, setJobId] = useState<number | null>(null);
  const candidates = useRecruiterCandidates(jobId);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const feedback = useRecruiterMutation(({ id, decision }: { id: number; decision: RecruiterDecision }) =>
    recruiterApi.feedback(id, decision, notes[id]?.trim() || undefined),
  );

  useEffect(() => {
    if (jobId === null && jobs.data && jobs.data.data.length > 0) setJobId(jobs.data.data[0].id);
  }, [jobs.data, jobId]);

  if (jobs.isLoading) return <Skeleton className="h-40 w-full" />;
  if (jobs.error || !jobs.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{jobs.error instanceof ApiError ? jobs.error.message : 'Your jobs could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const list = candidates.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{jobs.data.meta.company.name} · candidates</h1>
          <p className="text-sm text-muted-foreground">Candidates the placement office has shortlisted for your jobs. Your feedback goes to the placement office.</p>
        </div>
        {jobs.data.data.length > 0 ? (
          <Select aria-label="Job" value={jobId ?? ''} onChange={(e) => setJobId(Number(e.target.value))} className="md:w-80">
            {jobs.data.data.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.sharedCandidates} shared)
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {feedback.error ? (
        <Alert variant="destructive">
          <AlertDescription>{feedback.error instanceof ApiError ? feedback.error.message : 'Your feedback could not be saved.'}</AlertDescription>
        </Alert>
      ) : null}

      {jobs.data.data.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No jobs for your company yet.</Card>
      ) : candidates.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No candidates have been shared for this job yet.</Card>
      ) : (
        <ul className="space-y-3" aria-label="Candidates">
          {list.map((c) => (
            <li key={c.applicationId}>
              <Card className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.student.registrationNumber} · {c.student.department} · {c.student.year.replace('_', ' ')} · CGPA {c.student.cgpa ?? '—'}
                    </p>
                  </div>
                  <Badge variant="info">{c.status.replace('_', ' ')}</Badge>
                </div>
                {c.feedback.map((f) => (
                  <p key={`${f.at}-${f.note}`} className="rounded bg-muted/50 p-2 text-xs">
                    {f.note}
                  </p>
                ))}
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    aria-label={`Note for ${c.student.name}`}
                    placeholder="Note (optional)"
                    value={notes[c.applicationId] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [c.applicationId]: e.target.value })}
                  />
                  <div className="flex gap-1">
                    {DECISIONS.map((d) => (
                      <Button
                        key={d.value}
                        type="button"
                        size="sm"
                        variant={d.value === 'recommend' ? 'default' : 'outline'}
                        disabled={feedback.isPending}
                        onClick={() =>
                          feedback.mutate({ id: c.applicationId, decision: d.value }, { onSuccess: () => setNotes({ ...notes, [c.applicationId]: '' }) })
                        }
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
