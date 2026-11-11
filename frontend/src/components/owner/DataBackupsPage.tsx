/** Backups, restore drills & tenant export/deletion governance (SRS §5.23). */
import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Plus, ShieldAlert } from 'lucide-react';
import {
  Alert,
  AlertDescription,
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
import { OWNER, useInstitutions, useOwnerMutation } from '../../api/ownerApi';
import { ownerOperationsApi, useBackups, useDataRequests, type BackupItem, type DataRequestItem } from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function DataBackupsPage({ can }: OwnerPageProps) {
  const [tab, setTab] = useState('backups');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [verifyingBackup, setVerifyingBackup] = useState<BackupItem | null>(null);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<DataRequestItem | null>(null);

  const canManage = can(OWNER.dataManage);
  const backups = useBackups();
  const requests = useDataRequests();

  const alerts = backups.data?.alerts;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data governance & backups"
        description="Automated & manual snapshots, restore-drill verification, and safeguarded tenant export/deletion requests."
        actions={
          canManage ? (
            <>
              {tab === 'backups' ? (
                <Button size="sm" onClick={() => setCreatingBackup(true)}>
                  <Plus size={14} /> Trigger backup
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCreatingRequest(true)}>
                  <Plus size={14} /> Log data request
                </Button>
              )}
            </>
          ) : null
        }
      />

      {alerts && (alerts.backupOverdue24h || alerts.unverifiedRestores > 0) ? (
        <Alert variant="warning">
          <AlertTriangle size={16} />
          <AlertDescription>
            {alerts.backupOverdue24h ? 'Platform backup overdue (>24h since last verified snapshot). ' : ''}
            {alerts.unverifiedRestores > 0 ? `${alerts.unverifiedRestores} backup(s) awaiting restore-drill verification.` : ''}
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="backups">Backups &amp; restore drills</TabsTrigger>
          <TabsTrigger value="requests">Export &amp; deletion requests</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4 pt-4">
          {backups.isPending ? <LoadingRows rows={4} /> : null}
          {backups.isError ? <ErrorState error={backups.error} /> : null}
          {backups.data && backups.data.data.length === 0 ? <EmptyState title="No backups recorded yet" /> : null}
          {backups.data && backups.data.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type / Scope</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Backup status</TableHead>
                      <TableHead>Restore verification</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.data.data.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5 font-medium capitalize">
                            <DatabaseBackup size={14} className="text-primary" /> {b.backupType} ({b.scope})
                          </span>
                          <span className="text-2xs text-muted-foreground">{b.institution?.name ?? 'All tenants'}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{b.storageLocation}</TableCell>
                        <TableCell className="text-xs">{b.sizeMb ? `${b.sizeMb} MB` : '—'}</TableCell>
                        <TableCell><Badge variant="success" className="capitalize">{b.status}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {b.verified ? (
                            <Badge variant="success">Verified ({b.restoreOutcome})</Badge>
                          ) : (
                            <Badge variant="warning">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {canManage ? (
                            <Button size="sm" variant="outline" onClick={() => setVerifyingBackup(b)}>
                              <CheckCircle2 size={12} /> Verify restore
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 pt-4">
          {requests.isPending ? <LoadingRows rows={4} /> : null}
          {requests.isError ? <ErrorState error={requests.error} /> : null}
          {requests.data && requests.data.length === 0 ? <EmptyState title="No tenant export or deletion requests" /> : null}
          {requests.data && requests.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institution</TableHead>
                      <TableHead>Request type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead className="text-right">Governance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.data.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <span className="block font-medium">{req.institution?.name ?? '—'}</span>
                          <span className="font-mono text-2xs text-muted-foreground">{req.institution?.code}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.requestType === 'deletion' ? 'destructive' : 'info'} className="capitalize">
                            {req.requestType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'completed' || req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'destructive' : 'warning'} className="capitalize">
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {req.reviewedBy ?? 'Pending'} {req.reviewedAt ? `· ${formatDateTime(req.reviewedAt)}` : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage && req.status !== 'rejected' && req.status !== 'completed' ? (
                            <Button size="sm" variant="outline" onClick={() => setReviewingRequest(req)}>
                              <ShieldAlert size={12} /> Review
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {creatingBackup ? <TriggerBackupDialog onClose={() => setCreatingBackup(false)} /> : null}
      {verifyingBackup ? <VerifyRestoreDialog backup={verifyingBackup} onClose={() => setVerifyingBackup(null)} /> : null}
      {creatingRequest ? <CreateDataRequestDialog onClose={() => setCreatingRequest(false)} /> : null}
      {reviewingRequest ? <ReviewDataRequestDialog request={reviewingRequest} onClose={() => setReviewingRequest(null)} /> : null}
    </div>
  );
}

function TriggerBackupDialog({ onClose }: { onClose: () => void }) {
  const institutions = useInstitutions({ perPage: 100 });
  const [backupType, setBackupType] = useState<BackupItem['backupType']>('full');
  const [scope, setScope] = useState<BackupItem['scope']>('platform');
  const [institutionId, setInstitutionId] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.triggerBackup);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({
        backupType,
        scope,
        institutionId: scope === 'institution' && institutionId ? Number(institutionId) : null,
        notes: notes || undefined,
      });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Trigger manual backup</DialogTitle>
            <DialogDescription>Creates a snapshot record ready for restore-drill validation.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Backup type">
              <Select value={backupType} onChange={(e) => setBackupType(e.target.value as BackupItem['backupType'])}>
                <option value="full">Full database</option>
                <option value="incremental">Incremental</option>
                <option value="config">Config snapshot</option>
              </Select>
            </Field>
            <Field label="Scope">
              <Select value={scope} onChange={(e) => setScope(e.target.value as BackupItem['scope'])}>
                <option value="platform">Platform-wide</option>
                <option value="institution">Single institution</option>
              </Select>
            </Field>
          </div>
          {scope === 'institution' ? (
            <Field label="Institution">
              <Select required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
                <option value="">Select institution...</option>
                {institutions.data?.data.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Start backup</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VerifyRestoreDialog({ backup, onClose }: { backup: BackupItem; onClose: () => void }) {
  const [outcome, setOutcome] = useState<'passed' | 'failed'>('passed');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(() => ownerOperationsApi.verifyRestore(backup.id, { outcome, notes: notes || undefined }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync(undefined);
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Record restore verification drill</DialogTitle>
            <DialogDescription>{backup.storageLocation}</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Restore drill outcome">
            <Select value={outcome} onChange={(e) => setOutcome(e.target.value as 'passed' | 'failed')}>
              <option value="passed">Passed — Integrity verified</option>
              <option value="failed">Failed — Checksum / schema issue</option>
            </Select>
          </Field>
          <Field label="Verification notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save verification</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateDataRequestDialog({ onClose }: { onClose: () => void }) {
  const institutions = useInstitutions({ perPage: 100 });
  const [institutionId, setInstitutionId] = useState('');
  const [requestType, setRequestType] = useState<DataRequestItem['requestType']>('export');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createDataRequest);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({ institutionId: Number(institutionId), requestType, reason });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Log tenant data request</DialogTitle>
            <DialogDescription>Track GDPR/compliance export or tenant offboarding deletion requests.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Institution">
            <Select required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">Select institution...</option>
              {institutions.data?.data.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label="Request type">
            <Select value={requestType} onChange={(e) => setRequestType(e.target.value as DataRequestItem['requestType'])}>
              <option value="export">Full data export</option>
              <option value="deletion">Tenant deletion request</option>
            </Select>
          </Field>
          <Field label="Compliance reason / ticket ref"><Input required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Submit request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDataRequestDialog({ request, onClose }: { request: DataRequestItem; onClose: () => void }) {
  const [status, setStatus] = useState<'approved' | 'rejected' | 'completed'>(request.status === 'pending' ? 'approved' : 'completed');
  const [confirmation, setConfirmation] = useState('');
  const [err, setErr] = useState('');
  const expectedPhrase = request.institution ? `DELETE ${request.institution.code}` : 'DELETE TENANT';
  const mut = useOwnerMutation(() =>
    ownerOperationsApi.reviewDataRequest(request.id, { status, confirmation: confirmation || undefined }),
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (request.requestType === 'deletion' && status !== 'rejected' && confirmation !== expectedPhrase) {
      setErr(`Type "${expectedPhrase}" to authorize tenant deletion.`);
      return;
    }
    try {
      await mut.mutateAsync(undefined);
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Review {request.requestType} request</DialogTitle>
            <DialogDescription>
              {request.institution?.name ?? 'Tenant'} · {request.reason}
            </DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Decision">
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'approved' | 'rejected' | 'completed')}>
              <option value="approved">Approve</option>
              <option value="completed">Mark completed</option>
              <option value="rejected">Reject</option>
            </Select>
          </Field>
          {request.requestType === 'deletion' && status !== 'rejected' ? (
            <Field label={`Confirm deletion (${expectedPhrase})`}>
              <Input required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={expectedPhrase} />
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={request.requestType === 'deletion' && status !== 'rejected' ? 'destructive' : 'default'} disabled={mut.isPending}>
              Confirm decision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

