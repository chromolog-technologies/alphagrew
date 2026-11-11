/** Support ticketing, SLA breach monitoring, internal notes, attachments & CSAT (SRS §5.16). */
import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, LifeBuoy, Paperclip, Plus, Send, Star } from 'lucide-react';
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
} from '@/components/ui';
import { downloadFile, isApiConfigured } from '../../api/http';
import { OWNER, useInstitutions, useOwnerMutation } from '../../api/ownerApi';
import {
  ownerOperationsApi,
  useSupportTickets,
  useTicketDetail,
  type SupportTicket,
} from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, KpiCard, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const priorityVariant: Record<SupportTicket['priority'], 'secondary' | 'info' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  urgent: 'destructive',
};

export function SupportPage({ can }: OwnerPageProps) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [slaOnly, setSlaOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const canManage = can(OWNER.supportManage);
  const tickets = useSupportTickets({
    status: status || undefined,
    priority: priority || undefined,
    slaBreached: slaOnly ? 1 : undefined,
  });

  const summary = tickets.data?.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support & SLA operations"
        description="Cross-tenant support queue with first-response/resolution SLA tracking, private staff notes, attachments, escalations, and CSAT."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={14} /> New ticket
            </Button>
          ) : null
        }
      />

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Open queue" value={summary.open} icon={<LifeBuoy size={18} />} />
          <KpiCard label="Escalated tickets" value={summary.escalated} icon={<AlertTriangle size={18} />} />
          <KpiCard label="SLA breached" value={summary.slaBreached} />
          <KpiCard label="Avg CSAT" value={summary.avgCsat !== null ? `${summary.avgCsat} / 5` : '—'} icon={<Star size={18} />} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Select className="w-44" aria-label="Filter ticket status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_customer">Waiting customer</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
        <Select className="w-40" aria-label="Filter ticket priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={slaOnly} onChange={(e) => setSlaOnly(e.target.checked)} />
          <span>SLA breached only</span>
        </label>
      </div>

      {tickets.isPending ? <LoadingRows rows={4} /> : null}
      {tickets.isError ? <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} /> : null}
      {tickets.data && tickets.data.data.length === 0 ? <EmptyState title="No support tickets match" /> : null}
      {tickets.data && tickets.data.data.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Replies</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.data.data.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedId(t.id)}>
                    <TableCell>
                      <span className="font-mono text-2xs text-muted-foreground">{t.ticketNumber}</span>
                      <span className="block font-medium text-foreground">{t.subject}</span>
                      <span className="text-xs text-muted-foreground capitalize">{t.category.replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell className="text-xs">{t.institution?.name ?? 'Platform'}</TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[t.priority]} className="capitalize">
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'resolved' || t.status === 'closed' ? 'success' : t.status === 'escalated' ? 'destructive' : 'info'} className="capitalize">
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.slaBreached ? (
                        <Badge variant="destructive">Breached</Badge>
                      ) : (
                        <span className="text-muted-foreground">Due {formatDateTime(t.resolutionDueAt)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.repliesCount} · {t.attachmentsCount} files
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); }}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {creating ? <CreateTicketDialog onClose={() => setCreating(false)} /> : null}
      {selectedId ? <TicketDetailDialog id={selectedId} canManage={canManage} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}

function CreateTicketDialog({ onClose }: { onClose: () => void }) {
  const institutions = useInstitutions({ perPage: 100 });
  const [institutionId, setInstitutionId] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createTicket);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({
        institutionId: institutionId ? Number(institutionId) : null,
        subject,
        category,
        priority,
        description,
      });
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
            <DialogTitle>Create support ticket</DialogTitle>
            <DialogDescription>Logs a tracked issue with automatic SLA response and resolution deadlines.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Institution (optional)">
            <Select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">Platform / Internal</option>
              {institutions.data?.data.map((i) => (
                <option key={i.id} value={String(i.id)}>{i.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject"><Input required value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="onboarding">Onboarding</option>
                <option value="ai_credits">AI Credits</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              required
              rows={3}
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Create ticket</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketDetailDialog({ id, canManage, onClose }: { id: number; canManage: boolean; onClose: () => void }) {
  const detail = useTicketDetail(id);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [err, setErr] = useState('');

  const updateMut = useOwnerMutation((input: { status?: SupportTicket['status']; escalate?: boolean; csatScore?: number }) =>
    ownerOperationsApi.updateTicket(id, input),
  );
  const replyMut = useOwnerMutation(() => ownerOperationsApi.replyTicket(id, { body, isInternal, attachment }));

  const t = detail.data;

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await replyMut.mutateAsync(undefined);
      setBody('');
      setAttachment(null);
      void detail.refetch();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{t ? `${t.ticketNumber}: ${t.subject}` : 'Ticket details'}</DialogTitle>
          <DialogDescription>
            {t ? `${t.institution?.name ?? 'Platform'} · First response due ${formatDateTime(t.firstResponseDueAt)}` : ''}
          </DialogDescription>
        </DialogHeader>
        {detail.isPending ? <LoadingRows rows={4} /> : null}
        {detail.isError ? <ErrorState error={detail.error} /> : null}
        {t ? (
          <div className="space-y-4 text-xs">
            {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
              <Badge variant={priorityVariant[t.priority]} className="capitalize">{t.priority}</Badge>
              <Badge variant={t.status === 'resolved' ? 'success' : 'info'} className="capitalize">{t.status.replace(/_/g, ' ')}</Badge>
              {t.slaBreached ? <Badge variant="destructive">SLA Breached</Badge> : null}
              {t.escalationLevel > 0 ? <Badge variant="warning">Escalated L{t.escalationLevel}</Badge> : null}
              {t.csatScore ? <Badge variant="success">CSAT {t.csatScore}/5</Badge> : null}
              {canManage ? (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {t.status !== 'escalated' && t.status !== 'resolved' ? (
                    <Button size="sm" variant="outline" onClick={() => void updateMut.mutateAsync({ escalate: true }).then(() => detail.refetch())}>
                      Escalate
                    </Button>
                  ) : null}
                  {t.status !== 'resolved' ? (
                    <Button size="sm" onClick={() => void updateMut.mutateAsync({ status: 'resolved' }).then(() => detail.refetch())}>
                      <CheckCircle2 size={12} /> Resolve
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {t.description ? <p className="rounded-lg border border-border p-3 text-foreground whitespace-pre-wrap">{t.description}</p> : null}

            {t.attachments && t.attachments.length > 0 ? (
              <div className="space-y-1.5">
                <p className="font-semibold">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {t.attachments.map((att) => (
                    <Button
                      key={att.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (isApiConfigured()) {
                          void downloadFile(`/owner/support/attachments/${att.id}`, {}, att.originalName).catch((e) => setErr(errorMessage(e)));
                        }
                      }}
                    >
                      <Download size={12} /> {att.originalName} ({Math.round(att.sizeBytes / 1024)} KB)
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="font-semibold">Conversation &amp; internal notes ({t.replies?.length ?? 0})</p>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {t.replies?.map((rep) => (
                  <div key={rep.id} className={`rounded-lg border p-2.5 ${rep.isInternal ? 'border-amber-300 bg-amber-50/70' : 'border-border'}`}>
                    <div className="flex items-center justify-between text-2xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {rep.author} {rep.isInternal ? <Badge variant="warning">Internal note</Badge> : null}
                      </span>
                      <span>{formatDateTime(rep.at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{rep.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {canManage ? (
              <form onSubmit={(e) => void submitReply(e)} className="space-y-2 rounded-lg border border-border p-3">
                <textarea
                  required
                  rows={2}
                  placeholder="Write reply or private internal note..."
                  className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                      <span>Internal note (hidden from tenant)</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <Paperclip size={13} /> {attachment ? attachment.name : 'Attach file'}
                      <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  <Button type="submit" size="sm" disabled={replyMut.isPending}>
                    <Send size={12} /> {replyMut.isPending ? 'Sending…' : isInternal ? 'Add note' : 'Send reply'}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

