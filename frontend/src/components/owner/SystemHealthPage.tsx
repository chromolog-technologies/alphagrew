/** Live platform health indicators & incident management (SRS FR-SYS). */
import { useState, type FormEvent } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
} from '@/components/ui';
import { ownerApi, OWNER, useOwnerMutation, useSystemHealth, useSystemIncidents, type HealthStatus, type SystemIncident } from '../../api/ownerApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const badgeVariant: Record<HealthStatus, 'success' | 'warning' | 'destructive'> = {
  ok: 'success',
  warning: 'warning',
  down: 'destructive',
};

const severityVariant: Record<SystemIncident['severity'], 'info' | 'warning' | 'destructive'> = {
  low: 'info',
  medium: 'warning',
  high: 'destructive',
  critical: 'destructive',
};

export function SystemHealthPage({ can }: OwnerPageProps) {
  const health = useSystemHealth();
  const [statusFilter, setStatusFilter] = useState('');
  const [reporting, setReporting] = useState(false);
  const [resolving, setResolving] = useState<SystemIncident | null>(null);
  const incidents = useSystemIncidents(statusFilter ? { status: statusFilter } : {});
  const updateMut = useOwnerMutation(({ id, ...input }: { id: number; status?: SystemIncident['status']; resolutionNote?: string }) =>
    ownerApi.updateIncident(id, input),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="System health & incidents"
        description="Live database, queue, storage, AI telemetry and platform incident workflow."
        actions={
          <>
            {can(OWNER.settingsManage) ? (
              <Button size="sm" onClick={() => setReporting(true)}>
                <Plus size={14} /> Report incident
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => (void health.refetch(), void incidents.refetch())} disabled={health.isFetching}>
              <RefreshCw size={14} className={health.isFetching ? 'animate-spin' : ''} /> Refresh
            </Button>
          </>
        }
      />

      {health.isPending ? <LoadingRows rows={3} /> : null}
      {health.isError ? <ErrorState error={health.error} onRetry={() => void health.refetch()} /> : null}

      {health.data ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Overall status</span>
                <Badge variant={badgeVariant[health.data.status] ?? 'warning'} className="uppercase">
                  {health.data.status}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">Checked {formatDateTime(health.data.checkedAt)}</span>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.data.checks.map((check) => (
              <Card key={check.key}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">{check.label}</CardTitle>
                  <Badge variant={badgeVariant[check.status] ?? 'warning'} className="uppercase">
                    {check.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <p className="text-muted-foreground">{check.detail}</p>
                  {check.value !== null ? <p className="font-mono font-semibold text-foreground">{String(check.value)}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Platform incidents</CardTitle>
          <Select className="h-8 w-40" aria-label="Filter incidents status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All incidents</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="mitigated">Mitigated</option>
            <option value="resolved">Resolved</option>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {incidents.isPending ? <LoadingRows rows={3} /> : null}
          {incidents.isError ? <ErrorState error={incidents.error} /> : null}
          {incidents.data && incidents.data.length === 0 ? <EmptyState title="No platform incidents logged" /> : null}
          {incidents.data && incidents.data.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {incidents.data.map((inc) => (
                <li key={inc.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant[inc.severity]} className="capitalize">
                        {inc.severity}
                      </Badge>
                      <Badge variant={inc.status === 'resolved' ? 'success' : inc.status === 'mitigated' ? 'info' : 'warning'} className="capitalize">
                        {inc.status}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">{inc.component}</span>
                      <span className="font-medium text-foreground">{inc.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{inc.summary}</p>
                    {inc.resolutionNote ? <p className="text-xs text-emerald-700">Resolution: {inc.resolutionNote}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="mr-2 text-muted-foreground">{formatDateTime(inc.createdAt)}</span>
                    {can(OWNER.settingsManage) && inc.status !== 'resolved' ? (
                      <>
                        {inc.status === 'open' ? (
                          <Button size="sm" variant="outline" onClick={() => void updateMut.mutateAsync({ id: inc.id, status: 'investigating' })}>
                            Investigate
                          </Button>
                        ) : null}
                        {inc.status !== 'mitigated' ? (
                          <Button size="sm" variant="outline" onClick={() => void updateMut.mutateAsync({ id: inc.id, status: 'mitigated' })}>
                            Mitigate
                          </Button>
                        ) : null}
                        <Button size="sm" onClick={() => setResolving(inc)}>
                          Resolve
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {reporting ? <ReportIncidentDialog onClose={() => setReporting(false)} /> : null}
      {resolving ? <ResolveIncidentDialog incident={resolving} onClose={() => setResolving(null)} /> : null}
    </div>
  );
}

function ReportIncidentDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<SystemIncident['severity']>('medium');
  const [component, setComponent] = useState('api');
  const [summary, setSummary] = useState('');
  const [impact, setImpact] = useState('');
  const [err, setErr] = useState('');
  const createMut = useOwnerMutation(ownerApi.createIncident);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await createMut.mutateAsync({ title, severity, component, summary, impact: impact || undefined });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Report system incident</DialogTitle>
            <DialogDescription>Track degraded platform services, root cause investigation, and mitigation status.</DialogDescription>
          </DialogHeader>
          {err ? (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Title">
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Queue backlog in region-ap" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Severity">
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as SystemIncident['severity'])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
            <Field label="Component">
              <Input required value={component} onChange={(e) => setComponent(e.target.value)} placeholder="database, queue, ai_gateway..." />
            </Field>
          </div>
          <Field label="Summary">
            <Input required value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <Field label="Customer impact (optional)">
            <Input value={impact} onChange={(e) => setImpact(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create incident'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResolveIncidentDialog({ incident, onClose }: { incident: SystemIncident; onClose: () => void }) {
  const [resolutionNote, setResolutionNote] = useState(incident.resolutionNote ?? '');
  const [err, setErr] = useState('');
  const resolveMut = useOwnerMutation(() => ownerApi.updateIncident(incident.id, { status: 'resolved', resolutionNote }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await resolveMut.mutateAsync(undefined);
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Resolve incident</DialogTitle>
            <DialogDescription>{incident.title}</DialogDescription>
          </DialogHeader>
          {err ? (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Resolution note">
            <Input required value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="Root cause and verification summary" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={resolveMut.isPending}>Mark resolved</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

