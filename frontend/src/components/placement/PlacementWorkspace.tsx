import { useMemo, useState } from 'react';
import { ArrowLeft, Ban, CalendarClock, Download, Pencil, Plus, Send, Trash2, Users } from 'lucide-react';
import {
  APPLICATION_STATUS,
  EMPLOYMENT_TYPES,
  ROUND_TYPES,
  placementApi,
  useEligibleStudents,
  useJobApplications,
  useJobRounds,
  usePlacementJobs,
  usePlacementMutation,
  type Application,
  type ApplicationStatus,
  type Job,
  type RoundResultStatus,
  type RoundType,
} from '../../api/placementApi';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui';
import { JobEditorSheet } from './JobEditorSheet';
import { StatusBadge, deadlineHint, errorMessage, formatDate } from './placementUi';

const JOB_STATUS_BADGE = { draft: 'secondary', open: 'success', closed: 'outline' } as const;
/** Moves an officer can make from the applications table (offers have their own dialog). */
const OFFICER_MOVES: ApplicationStatus[] = ['shortlisted', 'in_rounds', 'selected', 'rejected'];

type Notice = { tone: 'success' | 'error'; text: string } | null;

/** Placement officer and admin workspace on the job-posting model. */
export function PlacementWorkspace() {
  const jobs = usePlacementJobs();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Job | null | undefined>(undefined); // undefined = closed, null = new
  const [notice, setNotice] = useState<Notice>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Job['status']>('all');

  const save = usePlacementMutation(({ id, input }: { id: number | null; input: Parameters<typeof placementApi.createJob>[0] }) =>
    id ? placementApi.updateJob(id, input) : placementApi.createJob(input));

  const selected = jobs.data?.data.find((job) => job.id === selectedId) ?? null;
  const visible = (jobs.data?.data ?? []).filter((job) => statusFilter === 'all' || job.status === statusFilter);

  return (
    <div className="space-y-5">
      {notice ? <Alert variant={notice.tone === 'error' ? 'destructive' : 'success'}><AlertDescription>{notice.text}</AlertDescription></Alert> : null}

      {selected ? (
        <JobDetail job={selected} onBack={() => setSelectedId(null)} onEdit={() => setEditing(selected)} onNotice={setNotice} />
      ) : (
        <>
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Placement drives</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Create jobs with eligibility rules, publish them, and move candidates from application to placement.</p>
            </div>
            <Button type="button" onClick={() => setEditing(null)}><Plus size={16} /> New job</Button>
          </header>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(['all', 'open', 'draft', 'closed'] as const).map((status) => (
              <Button key={status} type="button" size="sm" variant={statusFilter === status ? 'default' : 'outline'} onClick={() => setStatusFilter(status)}>
                {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {jobs.isPending ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-40" />)}</div>
          ) : jobs.isError ? (
            <Alert variant="destructive"><AlertDescription>{errorMessage(jobs.error, 'Jobs could not be loaded.')}</AlertDescription></Alert>
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No jobs yet. Click “New job” to create one.</p>
          ) : (
            <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedId(job.id)}
                  className="rounded-xl border border-border bg-card p-5 text-left shadow-card transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{job.company?.name}</p>
                    </div>
                    <Badge variant={JOB_STATUS_BADGE[job.status]}>{job.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {EMPLOYMENT_TYPES[job.employmentType]} · {job.packageDisplay ?? 'Package not set'}
                    {job.applyDeadline ? ` · apply by ${formatDate(job.applyDeadline)}` : ''}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Applied" value={job.counts?.total ?? 0} />
                    <Stat label="In process" value={(job.counts?.shortlisted ?? 0) + (job.counts?.in_rounds ?? 0) + (job.counts?.selected ?? 0) + (job.counts?.offered ?? 0)} />
                    <Stat label="Placed" value={job.counts?.placed ?? 0} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <JobEditorSheet
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        job={editing ?? null}
        companies={jobs.data?.companies ?? []}
        onSave={(input) =>
          save.mutateAsync({ id: editing?.id ?? null, input }).then((job) => {
            setNotice({ tone: 'success', text: editing ? 'Job saved.' : `Draft created for ${job.title}. Publish it when it is ready.` });
            setSelectedId(job.id);
          })
        }
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <p className="text-base font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-2xs text-muted-foreground">{label}</p>
    </div>
  );
}

function JobDetail({ job, onBack, onEdit, onNotice }: { job: Job; onBack: () => void; onEdit: () => void; onNotice: (notice: Notice) => void }) {
  const [tab, setTab] = useState('applications');
  const publish = usePlacementMutation(() => placementApi.publish(job.id));
  const close = usePlacementMutation(() => placementApi.close(job.id));
  const remove = usePlacementMutation(() => placementApi.deleteJob(job.id));
  const fail = (fallback: string) => (error: unknown) => onNotice({ tone: 'error', text: errorMessage(error, fallback) });

  return (
    <div className="space-y-5">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} /> All jobs</Button>

      <header className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{job.title}</h1>
            <Badge variant={JOB_STATUS_BADGE[job.status]}>{job.status}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {job.company?.name} · {EMPLOYMENT_TYPES[job.employmentType]} · {job.packageDisplay ?? 'Package not set'} · {job.location ?? 'Location not set'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock size={13} aria-hidden="true" />
            {job.applyDeadline ? `Apply by ${formatDate(job.applyDeadline, true)} (${deadlineHint(job.applyDeadline)})` : 'No application deadline'}
          </p>
          {job.eligibility?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.eligibility.map((rule, index) => (
                <Badge key={index} variant="outline">
                  {rule.label}: {rule.operator === 'gte' ? '≥' : rule.operator === 'lte' ? '≤' : rule.operator === 'eq' ? '=' : rule.operator === 'in' ? '' : 'not '}
                  {Array.isArray(rule.value) ? rule.value.join(', ') : typeof rule.value === 'object' ? `level ${rule.value.minLevel}+` : rule.value}
                </Badge>
              ))}
            </div>
          ) : <p className="mt-3 text-xs text-muted-foreground">No eligibility rules: every student can apply.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}><Pencil size={14} /> Edit</Button>
          {job.status !== 'open' ? (
            <Button
              type="button"
              size="sm"
              disabled={publish.isPending}
              onClick={() => publish.mutate(undefined, {
                onSuccess: (response) => onNotice({ tone: 'success', text: `Published. ${response.notified} eligible ${response.notified === 1 ? 'student was' : 'students were'} notified.` }),
                onError: fail('The job could not be published.'),
              })}
            >
              <Send size={14} /> Publish
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={close.isPending} onClick={() => close.mutate(undefined, { onError: fail('The job could not be closed.') })}>
              Close applications
            </Button>
          )}
          {job.counts?.total === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete job"
              onClick={() => window.confirm(`Delete ${job.title}?`) && remove.mutate(undefined, { onSuccess: onBack, onError: fail('The job could not be deleted.') })}
            >
              <Trash2 size={15} />
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="applications">Applications ({job.counts?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="eligible">Eligible students</TabsTrigger>
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
        </TabsList>
        <TabsContent value="applications"><ApplicationsPanel job={job} onNotice={onNotice} /></TabsContent>
        <TabsContent value="eligible"><EligiblePanel job={job} onNotice={onNotice} /></TabsContent>
        <TabsContent value="rounds"><RoundsPanel job={job} onNotice={onNotice} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicationsPanel({ job, onNotice }: { job: Job; onNotice: (notice: Notice) => void }) {
  const applications = useJobApplications(job.id);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [offerFor, setOfferFor] = useState<Application | null>(null);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const move = usePlacementMutation(({ ids, status }: { ids: number[]; status: ApplicationStatus }) => placementApi.moveApplications(ids, status, note || undefined));

  const rows = (applications.data ?? []).filter((application) => filter === 'all' || application.status === filter);
  const chosen = rows.filter((application) => selected.includes(application.id));
  // Only moves every selected application allows.
  const moves = OFFICER_MOVES.filter((status) => chosen.length > 0 && chosen.every((application) => application.allowedNext.includes(status)));
  const byStatus = useMemo(() => {
    const counts: Partial<Record<ApplicationStatus, number>> = {};
    (applications.data ?? []).forEach((application) => { counts[application.status] = (counts[application.status] ?? 0) + 1; });
    return counts;
  }, [applications.data]);

  if (applications.isPending) return <Skeleton className="h-48" />;
  if (!applications.data?.length) {
    return <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No applications yet.{job.status !== 'open' ? ' Publish the job so students can apply.' : ''}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter applications">
        <Button type="button" size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All ({applications.data.length})</Button>
        {(Object.keys(byStatus) as ApplicationStatus[]).map((status) => (
          <Button key={status} type="button" size="sm" variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)}>
            {APPLICATION_STATUS[status].label} ({byStatus[status]})
          </Button>
        ))}
      </div>

      {chosen.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium text-foreground">{chosen.length} selected</span>
          <Input aria-label="Note for the students" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional, sent to the students)" className="h-8 max-w-xs" />
          {moves.length ? moves.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === 'rejected' ? 'outline' : 'default'}
              disabled={move.isPending}
              onClick={() => move.mutate({ ids: chosen.map((application) => application.id), status }, {
                onSuccess: () => { setSelected([]); setNote(''); onNotice({ tone: 'success', text: `${chosen.length} moved to ${APPLICATION_STATUS[status].label}. Students were notified.` }); },
                onError: (error) => onNotice({ tone: 'error', text: errorMessage(error, 'The applications could not be moved.') }),
              })}
            >
              Move to {APPLICATION_STATUS[status].label}
            </Button>
          )) : <span className="text-xs text-muted-foreground">These applications have no common next step.</span>}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className="w-10"><span className="sr-only">Select</span></th>
              <th className="text-left">Student</th>
              <th className="text-left">Department</th>
              <th className="text-right">CGPA</th>
              <th className="text-left">Applied</th>
              <th className="text-left">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((application) => (
              <tr key={application.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${application.student?.name}`}
                    checked={selected.includes(application.id)}
                    onChange={(event) => setSelected((ids) => (event.target.checked ? [...ids, application.id] : ids.filter((id) => id !== application.id)))}
                    className="h-4 w-4 accent-primary"
                  />
                </td>
                <td>
                  <p className="font-medium text-foreground">{application.student?.name}</p>
                  <p className="font-mono text-2xs text-muted-foreground">{application.student?.registrationNumber}</p>
                </td>
                <td>{application.student?.departmentCode}</td>
                <td className="text-right tabular-nums">{application.student?.cgpa ?? '—'}</td>
                <td>{formatDate(application.appliedAt)}</td>
                <td>
                  <StatusBadge status={application.status} />
                  {application.offer?.respondBy && application.status === 'offered' ? <p className="mt-1 text-2xs text-muted-foreground">Respond by {formatDate(application.offer.respondBy)}</p> : null}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    {application.status === 'selected' ? <Button type="button" size="sm" onClick={() => setOfferFor(application)}>Make offer</Button> : null}
                    <Button type="button" size="sm" variant="ghost" onClick={() => setHistoryFor(historyFor === application.id ? null : application.id)}>
                      {historyFor === application.id ? 'Hide history' : 'History'}
                    </Button>
                  </div>
                  {historyFor === application.id ? (
                    <ol className="mt-2 space-y-1 text-left text-2xs text-muted-foreground">
                      {application.events?.map((event, index) => (
                        <li key={index}>
                          <span className="font-medium text-foreground">{APPLICATION_STATUS[event.toStatus]?.label ?? event.toStatus}</span>
                          {' · '}{formatDate(event.at, true)}{event.actor ? ` · ${event.actor}` : ''}{event.note ? ` — ${event.note}` : ''}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OfferDialog application={offerFor} job={job} onClose={() => setOfferFor(null)} onNotice={onNotice} />
    </div>
  );
}

function OfferDialog({ application, job, onClose, onNotice }: { application: Application | null; job: Job; onClose: () => void; onNotice: (notice: Notice) => void }) {
  const [ctc, setCtc] = useState('');
  const [respondBy, setRespondBy] = useState('');
  const [note, setNote] = useState('');
  const offer = usePlacementMutation(() => placementApi.offer(application!.id, {
    ctcLpa: ctc ? Number(ctc) : null,
    respondBy: respondBy || null,
    note: note || null,
  }));

  return (
    <Dialog open={application !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer for {application?.student?.name}</DialogTitle>
          <DialogDescription>The student is notified and must accept or decline by the respond-by date. Unanswered offers expire.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="offer-ctc">CTC (LPA)</Label>
            <Input id="offer-ctc" type="number" step="0.1" min="0" value={ctc} onChange={(event) => setCtc(event.target.value)} placeholder={job.ctcMaxLpa?.toString() ?? job.ctcMinLpa?.toString() ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-respond-by">Respond by</Label>
            <Input id="offer-respond-by" type="date" value={respondBy} onChange={(event) => setRespondBy(event.target.value)} />
            <p className="text-xs text-muted-foreground">Leave empty to use the placement policy’s default.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-note">Note</Label>
            <Input id="offer-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            disabled={offer.isPending}
            onClick={() => offer.mutate(undefined, {
              onSuccess: () => { onNotice({ tone: 'success', text: `Offer sent to ${application?.student?.name}.` }); onClose(); },
              onError: (error) => onNotice({ tone: 'error', text: errorMessage(error, 'The offer could not be made.') }),
            })}
          >
            Send offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EligiblePanel({ job, onNotice }: { job: Job; onNotice: (notice: Notice) => void }) {
  const eligible = useEligibleStudents(job.id);
  const [filter, setFilter] = useState<'eligible' | 'ineligible' | 'all'>('eligible');
  const [debarFor, setDebarFor] = useState<{ id: number; name: string } | null>(null);
  const rows = (eligible.data?.data ?? []).filter((row) => filter === 'all' || (filter === 'eligible') === row.eligible);

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Name', 'Registration number', 'Department', 'Year', 'CGPA', 'Eligible', 'Can apply', 'Reasons', 'Application'].map(escape).join(','),
      ...rows.map((row) => [
        row.name, row.registrationNumber, row.departmentCode, row.year, row.cgpa, row.eligible ? 'Yes' : 'No', row.canApply ? 'Yes' : 'No',
        [...row.failedRules.map((rule) => `${rule.label}: needs ${rule.expected}, has ${rule.actual}`), ...row.blockers.map((blocker) => blocker.message)].join('; '),
        row.applicationStatus ? APPLICATION_STATUS[row.applicationStatus].label : '',
      ].map(escape).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `${job.company?.name ?? 'job'}-${filter}-students.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };

  if (eligible.isPending) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users size={15} aria-hidden="true" />
          <strong className="text-foreground">{eligible.data?.summary.eligible}</strong> of {eligible.data?.summary.total} students meet the rules · {eligible.data?.summary.applied} applied
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(['eligible', 'ineligible', 'all'] as const).map((value) => (
            <Button key={value} type="button" size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>
              {value === 'eligible' ? 'Eligible' : value === 'ineligible' ? 'Not eligible' : 'All'}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}><Download size={14} /> CSV</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className="text-left">Student</th>
              <th className="text-left">Department</th>
              <th className="text-right">CGPA</th>
              <th className="text-left">Result</th>
              <th className="text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="font-mono text-2xs text-muted-foreground">{row.registrationNumber}</p>
                </td>
                <td>{row.departmentCode}</td>
                <td className="text-right tabular-nums">{row.cgpa ?? '—'}</td>
                <td>
                  {row.applicationStatus ? <StatusBadge status={row.applicationStatus} /> : row.canApply ? <Badge variant="success">Can apply</Badge> : row.eligible ? <Badge variant="warning">Eligible, blocked</Badge> : <Badge variant="destructive">Not eligible</Badge>}
                  {[...row.failedRules.map((rule) => `${rule.label}: needs ${rule.expected}, has ${rule.actual}`), ...row.blockers.map((blocker) => blocker.message)].map((reason) => (
                    <p key={reason} className="mt-1 text-2xs text-muted-foreground">{reason}</p>
                  ))}
                </td>
                <td className="text-right">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDebarFor({ id: row.id, name: row.name })}><Ban size={14} /> Debar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No students in this list.</p> : null}
      </div>

      <DebarDialog student={debarFor} onClose={() => setDebarFor(null)} onNotice={onNotice} />
    </div>
  );
}

function DebarDialog({ student, onClose, onNotice }: { student: { id: number; name: string } | null; onClose: () => void; onNotice: (notice: Notice) => void }) {
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  const debar = usePlacementMutation(() => placementApi.debar(student!.id, until, reason));
  const lift = usePlacementMutation(() => placementApi.lift(student!.id));

  return (
    <Dialog open={student !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Debar {student?.name}</DialogTitle>
          <DialogDescription>A debarred student cannot apply to any job until the date you set. The action is audit-logged.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="debar-until">Until</Label><Input id="debar-until" type="date" value={until} onChange={(event) => setUntil(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="debar-reason">Reason</Label><Input id="debar-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: skipped an accepted drive" /></div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => lift.mutate(undefined, { onSuccess: () => { onNotice({ tone: 'success', text: `Debarment lifted for ${student?.name}.` }); onClose(); } })}>
            Lift debarment
          </Button>
          <Button
            type="button"
            disabled={!until || !reason || debar.isPending}
            onClick={() => debar.mutate(undefined, {
              onSuccess: () => { onNotice({ tone: 'success', text: `${student?.name} is debarred until ${formatDate(until)}.` }); onClose(); },
              onError: (error) => onNotice({ tone: 'error', text: errorMessage(error, 'The student could not be debarred.') }),
            })}
          >
            Debar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoundsPanel({ job, onNotice }: { job: Job; onNotice: (notice: Notice) => void }) {
  const rounds = useJobRounds(job.id);
  const applications = useJobApplications(job.id);
  const [form, setForm] = useState({ name: '', type: 'technical' as RoundType, scheduledAt: '', durationMinutes: '' });
  const [results, setResults] = useState<Record<string, { status: RoundResultStatus | ''; score: string }>>({});
  const create = usePlacementMutation(() => placementApi.createRound(job.id, {
    name: form.name,
    type: form.type,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
  }));
  const record = usePlacementMutation(({ roundId, rows }: { roundId: number; rows: { applicationId: number; status: RoundResultStatus; score: number | null }[] }) =>
    placementApi.recordResults(roundId, rows));

  const candidates = (applications.data ?? []).filter((application) => ['shortlisted', 'in_rounds', 'selected', 'rejected'].includes(application.status));

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(undefined, {
            onSuccess: () => { setForm({ name: '', type: 'technical', scheduledAt: '', durationMinutes: '' }); onNotice({ tone: 'success', text: 'Round scheduled. Shortlisted candidates were notified.' }); },
            onError: (error) => onNotice({ tone: 'error', text: errorMessage(error, 'The round could not be scheduled.') }),
          });
        }}
      >
        <div className="space-y-1.5"><Label htmlFor="round-name">Round name</Label><Input id="round-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Technical interview" /></div>
        <div className="space-y-1.5">
          <Label htmlFor="round-type">Type</Label>
          <Select id="round-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as RoundType })}>
            {Object.entries(ROUND_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="round-when">When</Label><Input id="round-when" type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="round-minutes">Minutes</Label><Input id="round-minutes" type="number" min="5" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></div>
        <Button type="submit" disabled={create.isPending}><Plus size={14} /> Schedule</Button>
      </form>

      {rounds.isPending ? <Skeleton className="h-32" /> : (rounds.data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No rounds yet. Shortlist candidates, then schedule a round.</p>
      ) : (
        (rounds.data ?? []).map((round) => {
          const recorded = Object.fromEntries(round.results.map((result) => [result.applicationId, result]));
          const key = (applicationId: number) => `${round.id}:${applicationId}`;
          const pending = candidates
            .map((application) => ({ application, value: results[key(application.id)] }))
            .filter(({ value }) => value?.status);

          return (
            <section key={round.id} className="rounded-xl border border-border bg-card shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{round.sequence}. {round.name}</h3>
                  <p className="text-xs text-muted-foreground">{ROUND_TYPES[round.type]} · {round.scheduledAt ? formatDate(round.scheduledAt, true) : 'Date not set'}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending.length === 0 || record.isPending}
                  onClick={() => record.mutate({
                    roundId: round.id,
                    rows: pending.map(({ application, value }) => ({ applicationId: application.id, status: value!.status as RoundResultStatus, score: value!.score ? Number(value!.score) : null })),
                  }, {
                    onSuccess: () => { setResults({}); onNotice({ tone: 'success', text: `Results saved for ${round.name}. Candidates who did not clear it were marked not selected.` }); },
                    onError: (error) => onNotice({ tone: 'error', text: errorMessage(error, 'The results could not be saved.') }),
                  })}
                >
                  Save results{pending.length ? ` (${pending.length})` : ''}
                </Button>
              </div>
              <div className="overflow-x-auto px-2 pb-3 pt-2">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr><th className="text-left">Candidate</th><th className="text-left">Status</th><th className="text-left">Result</th><th className="text-left">Score</th></tr></thead>
                  <tbody>
                    {candidates.map((application) => {
                      const current = results[key(application.id)];
                      const saved = recorded[application.id];
                      return (
                        <tr key={application.id}>
                          <td>{application.student?.name}</td>
                          <td><StatusBadge status={application.status} /></td>
                          <td>
                            <Select
                              aria-label={`${round.name} result for ${application.student?.name}`}
                              value={current?.status ?? saved?.status ?? ''}
                              onChange={(event) => setResults((items) => ({ ...items, [key(application.id)]: { status: event.target.value as RoundResultStatus, score: items[key(application.id)]?.score ?? '' } }))}
                              className="h-8"
                            >
                              <option value="">Not recorded</option>
                              <option value="passed">Cleared</option>
                              <option value="failed">Not cleared</option>
                              <option value="absent">Absent</option>
                            </Select>
                          </td>
                          <td>
                            <Input
                              aria-label={`${round.name} score for ${application.student?.name}`}
                              type="number"
                              min="0"
                              className="h-8 w-24"
                              value={current?.score ?? saved?.score?.toString() ?? ''}
                              onChange={(event) => setResults((items) => ({ ...items, [key(application.id)]: { status: items[key(application.id)]?.status ?? saved?.status ?? '', score: event.target.value } }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {candidates.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">Shortlist applications first.</p> : null}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
