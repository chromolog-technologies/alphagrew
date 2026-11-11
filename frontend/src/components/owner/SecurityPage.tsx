/** Cross-tenant audit log, login history, and active session review (SRS FR-SEC). */
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { ownerApi, OWNER, useAuditLogs, useLoginHistory, useOwnerMutation, useSessions } from '../../api/ownerApi';
import { actionLabel, EmptyState, ErrorState, formatDateTime, LoadingRows, PageHeader, Pagination } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function SecurityPage({ can }: OwnerPageProps) {
  const canAudit = can(OWNER.auditView);
  const canSecurity = can(OWNER.securityView);
  const [activeTab, setActiveTab] = useState(canAudit ? 'audit' : 'logins');
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loginPage, setLoginPage] = useState(1);
  const [outcome, setOutcome] = useState('');

  const audits = useAuditLogs({ action: actionFilter, page: auditPage, perPage: 25 });
  const logins = useLoginHistory({ outcome, page: loginPage, perPage: 25 });
  const sessions = useSessions();
  const revoke = useOwnerMutation((id: number) => ownerApi.revokeSession(id));

  return (
    <div className="space-y-5">
      <PageHeader title="Audit & security" description="Cross-tenant administrative audit trail, sign-in attempts, and active sessions." />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {canAudit ? <TabsTrigger value="audit">Audit log</TabsTrigger> : null}
          {canSecurity ? <TabsTrigger value="logins">Login history</TabsTrigger> : null}
          {canSecurity ? <TabsTrigger value="sessions">Active sessions</TabsTrigger> : null}
        </TabsList>

        {canAudit ? (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <Input
                  placeholder="Filter by action (e.g. auth., owner.)"
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="max-w-xs"
                />
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
                <Select
                  value={outcome}
                  onChange={(e) => {
                    setOutcome(e.target.value);
                    setLoginPage(1);
                  }}
                  className="max-w-xs"
                >
                  <option value="">All outcomes</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="refused">Refused</option>
                  <option value="locked">Locked</option>
                  <option value="mfa_failed">MFA failed</option>
                </Select>
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
                            {!session.current ? (
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
    </div>
  );
}
