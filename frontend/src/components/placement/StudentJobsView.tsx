import { useMemo, useState } from 'react';
import { Briefcase, Building2, CalendarClock, CheckCircle2, MapPin, Search, XCircle } from 'lucide-react';
import {
  EMPLOYMENT_TYPES,
  placementApi,
  useMyApplications,
  useMyJobs,
  usePlacementMutation,
  type Application,
  type Job,
} from '../../api/placementApi';
import { Alert, AlertDescription, Badge, Button, Input, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '../ui';
import { StatusBadge, deadlineHint, errorMessage, formatDate } from './placementUi';

/**
 * Student placements: open jobs with the student's eligibility (and exactly which rule or
 * policy stops them), applying, and their applications with history and offers.
 */
export function StudentJobsView() {
  const jobs = useMyJobs();
  const applications = useMyApplications();
  const [tab, setTab] = useState('jobs');
  const [search, setSearch] = useState('');
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const apply = usePlacementMutation((jobId: number) => placementApi.apply(jobId));
  const optOut = usePlacementMutation((optedOut: boolean) => placementApi.setOptOut(optedOut));

  const placement = jobs.data?.placement;
  const visibleJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (jobs.data?.data ?? []).filter((job) => {
      if (onlyEligible && !job.assessment?.canApply && !job.application) return false;
      if (!term) return true;
      return [job.title, job.company?.name, job.location, ...job.requiredSkills].some((value) => value?.toLowerCase().includes(term));
    });
  }, [jobs.data, search, onlyEligible]);

  const pendingOffers = (applications.data ?? []).filter((application) => application.status === 'offered');

  const handleApply = (job: Job) => {
    setMessage(null);
    apply.mutate(job.id, {
      onSuccess: () => setMessage({ tone: 'success', text: `Applied to ${job.title} at ${job.company?.name ?? 'the company'}.` }),
      onError: (error) => setMessage({ tone: 'error', text: errorMessage(error, 'The application could not be sent.') }),
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Placements</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Jobs open to you, why you can or cannot apply, and where your applications stand.</p>
        </div>
        {placement ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={placement.optedOut}
              onChange={(event) => optOut.mutate(event.target.checked)}
              disabled={optOut.isPending}
              className="h-4 w-4 accent-primary"
            />
            Opt out of placements this season (for example, for higher studies)
          </label>
        ) : null}
      </header>

      {placement?.placedAt ? (
        <Alert>
          <AlertDescription>
            You are placed at <strong>{placement.placedAt}</strong>.
            {placement.policy.oneOfferRule
              ? placement.policy.dreamOfferEnabled && placement.policy.dreamOfferMinCtc
                ? ` Under the one-offer rule you can apply to one more job with a CTC of ${placement.policy.dreamOfferMinCtc} LPA or more.`
                : ' Under the one-offer rule you cannot apply to other jobs.'
              : ''}
          </AlertDescription>
        </Alert>
      ) : null}
      {placement?.debarredUntil ? (
        <Alert variant="destructive">
          <AlertDescription>
            You are debarred from placements until {formatDate(placement.debarredUntil)}{placement.debarReason ? `: ${placement.debarReason}` : '.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {pendingOffers.length ? (
        <Alert>
          <AlertDescription>
            You have {pendingOffers.length === 1 ? 'an offer' : `${pendingOffers.length} offers`} waiting for your answer. See “My applications”.
          </AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant={message.tone === 'error' ? 'destructive' : 'success'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="jobs">Jobs{jobs.data ? ` (${jobs.data.data.length})` : ''}</TabsTrigger>
          <TabsTrigger value="applications">My applications{applications.data ? ` (${applications.data.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search jobs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by company, role, skill or location" className="pl-9" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={onlyEligible} onChange={(event) => setOnlyEligible(event.target.checked)} className="h-4 w-4 accent-primary" />
              Only jobs I can apply to
            </label>
          </div>

          {jobs.isPending ? (
            <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-48" />)}</div>
          ) : jobs.isError ? (
            <Alert variant="destructive"><AlertDescription>{errorMessage(jobs.error, 'Jobs could not be loaded.')}</AlertDescription></Alert>
          ) : visibleJobs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              {jobs.data?.data.length ? 'No jobs match your filters.' : 'No jobs are open right now. You will get a notification when one you are eligible for is published.'}
            </p>
          ) : (
            <div className="stagger grid gap-4 lg:grid-cols-2">
              {visibleJobs.map((job) => (
                <JobCard key={job.id} job={job} onApply={() => handleApply(job)} applying={apply.isPending && apply.variables === job.id} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {applications.isPending ? (
            <Skeleton className="h-40" />
          ) : (applications.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">You have not applied to any jobs yet.</p>
          ) : (
            (applications.data ?? []).map((application) => <ApplicationCard key={application.id} application={application} onMessage={setMessage} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobCard({ job, onApply, applying }: { job: Job; onApply: () => void; applying: boolean }) {
  const assessment = job.assessment;
  const failed = assessment?.rules.filter((rule) => !rule.passed) ?? [];
  const hint = deadlineHint(job.applyDeadline);

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{job.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{job.company?.name ?? 'Company'}</p>
          </div>
        </div>
        {job.application ? (
          <StatusBadge status={job.application.status} />
        ) : assessment?.canApply ? (
          <Badge variant="success">Eligible</Badge>
        ) : assessment?.eligible ? (
          <Badge variant="warning">Can’t apply yet</Badge>
        ) : (
          <Badge variant="destructive">Not eligible</Badge>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground"><Briefcase size={13} aria-hidden="true" /><dt className="sr-only">Type</dt><dd>{EMPLOYMENT_TYPES[job.employmentType]}</dd></div>
        <div className="font-semibold text-foreground"><dt className="sr-only">Package</dt><dd>{job.packageDisplay ?? 'Package not disclosed'}</dd></div>
        <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={13} aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{job.location ?? '—'}</dd></div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock size={13} aria-hidden="true" />
          <dt className="sr-only">Apply by</dt>
          <dd>{job.applyDeadline ? `Apply by ${formatDate(job.applyDeadline)}${hint ? ` · ${hint}` : ''}` : 'No deadline'}</dd>
        </div>
      </dl>

      {job.requiredSkills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.requiredSkills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
        </div>
      ) : null}

      {!job.application && (failed.length || assessment?.blockers.length) ? (
        <ul className="mt-4 space-y-1.5 rounded-lg bg-muted/60 p-3 text-xs" aria-label="Why you cannot apply">
          {failed.map((rule) => (
            <li key={rule.field + rule.expected} className="flex items-start gap-2 text-foreground">
              <XCircle size={14} className="mt-px shrink-0 text-destructive" aria-hidden="true" />
              <span><strong>{rule.label}</strong>: needs {rule.expected}, you have {rule.actual}</span>
            </li>
          ))}
          {assessment?.blockers.map((blocker) => (
            <li key={blocker.code} className="flex items-start gap-2 text-foreground">
              <XCircle size={14} className="mt-px shrink-0 text-warning" aria-hidden="true" />
              <span>{blocker.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!job.application && assessment?.canApply && assessment.rules.length ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-success">
          <CheckCircle2 size={14} aria-hidden="true" /> You meet all {assessment.rules.length} eligibility {assessment.rules.length === 1 ? 'rule' : 'rules'}.
        </p>
      ) : null}

      <div className="mt-auto flex justify-end pt-4">
        {job.application ? (
          <span className="text-xs text-muted-foreground">Applied {formatDate(job.application.appliedAt)}</span>
        ) : (
          <Button type="button" size="sm" onClick={onApply} disabled={!assessment?.canApply || applying}>
            {applying ? 'Applying…' : 'Apply'}
          </Button>
        )}
      </div>
    </article>
  );
}

function ApplicationCard({ application, onMessage }: { application: Application; onMessage: (message: { tone: 'success' | 'error'; text: string }) => void }) {
  const withdraw = usePlacementMutation(() => placementApi.withdraw(application.id));
  const respond = usePlacementMutation((accept: boolean) => placementApi.respondToOffer(application.id, accept));
  const canWithdraw = application.allowedNext.includes('withdrawn');
  const company = application.job?.company ?? 'the company';

  const answer = (accept: boolean) => {
    const question = accept
      ? `Accept the offer from ${company}? Under the one-offer rule your other open applications will be withdrawn.`
      : `Decline the offer from ${company}? This cannot be undone.`;
    if (!window.confirm(question)) return;
    respond.mutate(accept, {
      onSuccess: () => onMessage({ tone: 'success', text: accept ? `Congratulations! You accepted the offer from ${company}.` : `You declined the offer from ${company}.` }),
      onError: (error) => onMessage({ tone: 'error', text: errorMessage(error, 'Your answer could not be saved.') }),
    });
  };

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{application.job?.title}</h2>
          <p className="text-sm text-muted-foreground">{company} · {application.job?.packageDisplay ?? 'Package not disclosed'}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {application.offer && application.status === 'offered' ? (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            Offer{application.offer.ctcLpa !== null ? `: ${application.offer.ctcLpa} LPA` : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Respond by {formatDate(application.offer.respondBy, true)}. Unanswered offers expire.{application.offer.note ? ` ${application.offer.note}` : ''}
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={() => answer(true)} disabled={respond.isPending}>Accept offer</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => answer(false)} disabled={respond.isPending}>Decline</Button>
          </div>
        </div>
      ) : null}

      {application.events?.length ? (
        <ol className="mt-4 space-y-2 border-l border-border pl-4" aria-label="History">
          {application.events.map((event, index) => (
            <li key={`${event.toStatus}-${index}`} className="relative text-xs">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" aria-hidden="true" />
              <span className="font-medium text-foreground">{event.toStatus.replace('_', ' ')}</span>
              <span className="text-muted-foreground"> · {formatDate(event.at, true)}</span>
              {event.note ? <p className="text-muted-foreground">{event.note}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {application.roundResults?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {application.roundResults.map((result) => (
            <Badge key={result.roundId} variant={result.status === 'passed' ? 'success' : 'destructive'}>
              {result.round}: {result.status}{result.score !== null ? ` (${result.score})` : ''}
            </Badge>
          ))}
        </div>
      ) : null}

      {canWithdraw ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={withdraw.isPending}
            onClick={() => {
              if (!window.confirm(`Withdraw your application to ${company}? You cannot apply to this job again.`)) return;
              withdraw.mutate(undefined, {
                onError: (error) => onMessage({ tone: 'error', text: errorMessage(error, 'The application could not be withdrawn.') }),
              });
            }}
          >
            Withdraw application
          </Button>
        </div>
      ) : null}
    </article>
  );
}
