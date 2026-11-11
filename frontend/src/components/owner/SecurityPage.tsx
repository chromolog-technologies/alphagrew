/** Cross-tenant audit log, login history, security events, and active session review (SRS FR-SEC). */
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  ownerApi,
  OWNER,
  useAuditLogs,
  useInstitutions,
  useLoginHistory,
  useOwnerMutation,
  useSecurityEvents,
  useSessions,
  type AuditEntry,
  type SecurityEvent,
} from '../../api/ownerApi';
import { actionLabel, EmptyState, ErrorState, formatDateTime, LoadingRows, PageHeader, Pagination } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function SecurityPage({ can }: OwnerPageProps) {
  const canAudit = can(OWNER.auditView);
  const canSecurity = can(OWNER.securityView);
  const canSessions = can(OWNER.usersSessions);
  const [activeTab, setActiveTab] = useState(canAudit ? 'audit' : 'logins');
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [auditInstId, setAuditInstId] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [diffEntry, setDiffEntry] = useState<AuditEntry | null>(null);

  const [loginPage, setLoginPage] = useState(1);
  const [outcome, setOutcome] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginInstId, setLoginInstId] = useState('');
  const [loginFrom, setLoginFrom] = useState('');
  const [loginTo, setLoginTo] = useState('');

  const [eventPage, setEventPage] = useState(1);
  const [eventSeverity, setEventSeverity] = useState('');
  const [eventStatus, setEventStatus] = useState('');

  const institutions = useInstitutions({ perPage: 100 });
  const audits = useAuditLogs({
    action: actionFilter || undefined,
    institutionId: auditInstId || undefined,
    from: auditFrom || undefined,
    to: auditTo || undefined,
    page: auditPage,
    perPage: 25,
  });
  const logins = useLoginHistory({
    outcome: outcome || undefined,
    email: loginEmail || undefined,
    institutionId: loginInstId || undefined,
    from: loginFrom || undefined,
    to: loginTo || undefined,
    page: loginPage,
    perPage: 25,
  });
  const securityEvents = useSecurityEvents({
    severity: eventSeverity || undefined,
    status: eventStatus || undefined,
    page: eventPage,
    perPage: 25,
  });
  const sessions = useSessions();
  const revoke = useOwnerMutation((id: number) => ownerApi.revokeSession(id));
  const updateSecEvent = useOwnerMutation(({ id, status }: { id: number; status: SecurityEvent['status'] }) =>
    ownerApi.updateSecurityEvent(id, status),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Audit & security" description="Cross-tenant audit trail, JSON change diffs, security events, sign-in attempts, and active sessions." />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {canAudit ? <TabsTrigger value="audit">Audit log</TabsTrigger> : null}
          {canSecurity ? <TabsTrigger value="logins">Login history</TabsTrigger> : null}
          {canSecurity ? <TabsTrigger value="events">Security events</TabsTrigger> : null}
          {canSecurity ? <TabsTrigger value="sessions">Active sessions</TabsTrigger> : null}
        </TabsList>

        {canAudit ? (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-2 md:grid-cols-4">
                  <Input
                    aria-label="Filter audit action"
                    placeholder="Filter action (e.g. auth., owner.)"
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value);
                      setAuditPage(1);
                    }}
                  />
                  <Select aria-label="Audit institution" value={auditInstId} onChange={(e) => (setAuditInstId(e.target.value), setAuditPage(1))}>
                    <option value="">All institutions</option>
                    {institutions.data?.data.map((i) => (
                      <option key={i.id} value={String(i.id)}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                  <Input aria-label="Audit from" type="date" value={auditFrom} onChange={(e) => (setAuditFrom(e.target.value), setAuditPage(1))} />
                  <Input aria-label="Audit to" type="date" value={auditTo} onChange={(e) => (setAuditTo(e.target.value), setAuditPage(1))} />
                </div>
                {audits.isPending ? <LoadingRows rows={5} /> : null}
                {audits.isError ? <ErrorState error={audits.error} onRetry={() => void audits.refetch()} /> : null}
                {audits.data && audits.data.data.length === 0 ? (
                  <EmptyState title="No audit events match" />
                ) : audits.data ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Institution</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>When</TableHead>
                          <TableHead className="text-right">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audits.data.data.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{actionLabel(entry.action)}</TableCell>
                            <TableCell>{entry.actor?.email ?? 'System'}</TableCell>
                            <TableCell>{entry.institution ?? 'Platform'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{entry.ip ?? '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</TableCell>
                            <TableCell className="text-right">
                              {entry.old || entry.new ? (
                                <Button size="sm" variant="ghost" onClick={() => setDiffEntry(entry)}>
                                  View diff
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination meta={audits.data.meta} onPage={setAuditPage} />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canSecurity ? (
          <TabsContent value="logins" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-2 md:grid-cols-5">
                  <Input
                    aria-label="Login email filter"
                    placeholder="Email contains..."
                    value={loginEmail}
                    onChange={(e) => (setLoginEmail(e.target.value), setLoginPage(1))}
                  />
                  <Select
                    aria-label="Login outcome filter"
                    value={outcome}
                    onChange={(e) => {
                      setOutcome(e.target.value);
                      setLoginPage(1);
                    }}
                  >
                    <option value="">All outcomes</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="refused">Refused</option>
                    <option value="locked">Locked</option>
                    <option value="mfa_failed">MFA failed</option>
                  </Select>
                  <Select aria-label="Login institution filter" value={loginInstId} onChange={(e) => (setLoginInstId(e.target.value), setLoginPage(1))}>
                    <option value="">All institutions</option>
                    {institutions.data?.data.map((i) => (
                      <option key={i.id} value={String(i.id)}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                  <Input aria-label="Login from" type="date" value={loginFrom} onChange={(e) => (setLoginFrom(e.target.value), setLoginPage(1))} />
                  <Input aria-label="Login to" type="date" value={loginTo} onChange={(e) => (setLoginTo(e.target.value), setLoginPage(1))} />
                </div>
                {logins.isPending ? <LoadingRows rows={5} /> : null}
                {logins.isError ? <ErrorState error={logins.error} onRetry={() => void logins.refetch()} /> : null}
                {logins.data && logins.data.data.length === 0 ? (
                  <EmptyState title="No sign-in records found" />
                ) : logins.data ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logins.data.data.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.email}</TableCell>
                            <TableCell>
                              <Badge variant={entry.outcome === 'success' ? 'success' : entry.outcome === 'refused' ? 'warning' : 'destructive'}>
                                {entry.outcome}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{entry.reason ?? '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{entry.ip ?? '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination meta={logins.data.meta} onPage={setLoginPage} />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canSecurity ? (
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <Select className="w-44" aria-label="Event severity" value={eventSeverity} onChange={(e) => (setEventSeverity(e.target.value), setEventPage(1))}>
                    <option value="">All severities</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>
                  <Select className="w-44" aria-label="Event status" value={eventStatus} onChange={(e) => (setEventStatus(e.target.value), setEventPage(1))}>
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
                {securityEvents.isPending ? <LoadingRows rows={4} /> : null}
                {securityEvents.isError ? <ErrorState error={securityEvents.error} /> : null}
                {securityEvents.data && securityEvents.data.data.length === 0 ? (
                  <EmptyState title="No security events" description="No anomalous sign-ins or lockout alerts detected." />
                ) : securityEvents.data ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>When</TableHead>
                          <TableHead className="text-right">Workflow</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securityEvents.data.data.map((ev) => (
                          <TableRow key={ev.id}>
                            <TableCell>
                              <Badge variant={ev.severity === 'critical' || ev.severity === 'high' ? 'destructive' : ev.severity === 'warning' ? 'warning' : 'info'}>
                                {ev.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="block font-medium text-xs">{ev.eventType.replace(/_/g, ' ')}</span>
                              <span className="block text-xs text-muted-foreground">{ev.summary}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {ev.email ?? ev.institution ?? 'Platform'} {ev.ip ? `· ${ev.ip}` : ''}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ev.status === 'resolved' ? 'success' : ev.status === 'acknowledged' ? 'info' : 'warning'}>{ev.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTime(ev.at)}</TableCell>
                            <TableCell className="space-x-1 text-right">
                              {ev.status === 'open' ? (
                                <Button size="sm" variant="outline" onClick={() => void updateSecEvent.mutateAsync({ id: ev.id, status: 'acknowledged' })}>
                                  Acknowledge
                                </Button>
                              ) : null}
                              {ev.status !== 'resolved' ? (
                                <Button size="sm" onClick={() => void updateSecEvent.mutateAsync({ id: ev.id, status: 'resolved' })}>
                                  Resolve
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination meta={securityEvents.data.meta} onPage={setEventPage} />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canSecurity ? (
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                {sessions.isPending ? <LoadingRows rows={4} /> : null}
                {sessions.isError ? <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} /> : null}
                {sessions.data && sessions.data.length === 0 ? (
                  <EmptyState title="No active sessions" />
                ) : sessions.data ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Last active</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.data.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.user?.email ?? 'Unknown'}</TableCell>
                          <TableCell>
                            {session.device} {session.current ? <Badge variant="info">Current</Badge> : null}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(session.lastUsedAt)}</TableCell>
                          <TableCell className="text-right">
                            {!session.current && canSessions ? (
                              <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => void revoke.mutateAsync(session.id)}>
                                Revoke
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>

      {diffEntry ? (
        <Dialog open onOpenChange={(o) => !o && setDiffEntry(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" onClose={() => setDiffEntry(null)}>
            <DialogHeader>
              <DialogTitle>{actionLabel(diffEntry.action)}</DialogTitle>
              <DialogDescription>
                {diffEntry.actor?.email ?? 'System'} · {formatDateTime(diffEntry.at)} · {diffEntry.ip ?? '—'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div>
                <p className="mb-1 font-semibold">Previous values</p>
                <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-2.5">
                  {JSON.stringify(diffEntry.old ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-semibold">New values</p>
                <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-2.5">
                  {JSON.stringify(diffEntry.new ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDiffEntry(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
