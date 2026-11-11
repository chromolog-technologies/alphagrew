/** Subscriptions & trials (SRS §5.7): assignment, plan changes, renewals, pause/resume, grace periods & cancellations. */
import { useState, type FormEvent } from 'react';
import { CalendarPlus, PauseCircle, PlayCircle, Plus, RefreshCw, Repeat, XCircle } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { ApiError } from '../../api/http';
import {
  ownerApi,
  OWNER,
  useInstitutions,
  useOwnerMutation,
  usePlans,
  useSubscription,
  useSubscriptions,
  type Subscription,
} from '../../api/ownerApi';
import {
  CommercialStatusBadge,
  EmptyState,
  ErrorState,
  Field,
  formatDate,
  formatDateTime,
  formatMoney,
  LoadingRows,
  PageHeader,
  Pagination,
  errorMessage,
} from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function SubscriptionsPage({ can }: OwnerPageProps) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const list = useSubscriptions({ status, search, page, perPage: 20 });
  const canManage = can(OWNER.subscriptionsManage);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subscriptions & trials"
        description="Assign plans to institutions, manage trials, grace periods, upgrades, renewals and cancellations."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setAssigning(true)}>
              <Plus size={14} /> Assign subscription
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          placeholder="Search institution name or code..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          className="w-44"
          aria-label="Filter subscription status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </Select>
      </div>

      {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.isPending ? <LoadingRows rows={5} /> : null}
      {list.data && list.data.data.length === 0 ? (
        <EmptyState title="No subscriptions found" description="Assign a subscription plan to start tracking commercial renewals." />
      ) : null}

      {list.data && list.data.data.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price / Cycle</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Renewal / End</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.data.map((sub) => (
                  <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedId(sub.id)}>
                    <TableCell>
                      <span className="block font-medium text-foreground">{sub.institution?.name ?? '—'}</span>
                      <span className="text-xs text-muted-foreground">{sub.institution?.code}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium">{sub.plan?.name ?? '—'}</span>
                      <span className="text-xs text-muted-foreground">v{sub.planVersionNumber ?? 1}</span>
                    </TableCell>
                    <TableCell>
                      <CommercialStatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell>
                      {formatMoney(sub.amount, sub.currency)} <span className="text-xs text-muted-foreground">/ {sub.billingCycle}</span>
                    </TableCell>
                    <TableCell>{formatMoney(sub.mrr, sub.currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(sub.renewalAt ?? sub.endAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedId(sub.id); }}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {list.data ? <Pagination meta={list.data.meta} onPage={setPage} /> : null}

      {assigning ? <AssignSubscriptionDialog onClose={() => setAssigning(false)} /> : null}
      {selectedId ? <SubscriptionDetailDialog id={selectedId} canManage={canManage} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}

function AssignSubscriptionDialog({ onClose }: { onClose: () => void }) {
  const institutions = useInstitutions({ perPage: 100 });
  const plans = usePlans({ status: 'active' });
  const [institutionId, setInstitutionId] = useState('');
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<'trial' | 'active'>('active');
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const assign = useOwnerMutation(ownerApi.assignSubscription);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    try {
      await assign.mutateAsync({
        institutionId: Number(institutionId),
        planId: Number(planId),
        status,
        generateInvoice: status === 'active' ? generateInvoice : false,
      });
      onClose();
    } catch (error) {
      setErrorMsg(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign subscription</DialogTitle>
          <DialogDescription>Attaches a plan version entitlement snapshot and allocates AI credits to the institution wallet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {errorMsg ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Institution">
            <Select required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">Select institution...</option>
              {institutions.data?.data.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Active plan">
            <Select required value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Select plan...</option>
              {plans.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currentVersion ? formatMoney(p.currentVersion.price, p.currentVersion.currency) : ''} / {p.currentVersion?.billingCycle})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Initial status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'trial' | 'active')}>
              <option value="active">Active (paid)</option>
              <option value="trial">Trial</option>
            </Select>
          </Field>
          {status === 'active' ? (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={generateInvoice} onChange={(e) => setGenerateInvoice(e.target.checked)} />
              <span>Automatically generate initial invoice for subscription + setup fee</span>
            </label>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={assign.isPending}>{assign.isPending ? 'Assigning...' : 'Assign subscription'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDetailDialog({ id, canManage, onClose }: { id: number; canManage: boolean; onClose: () => void }) {
  const detail = useSubscription(id);
  const plans = usePlans({ status: 'active' });
  const [action, setAction] = useState<'change' | 'extend' | 'pause' | 'cancel' | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('');
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const renewMut = useOwnerMutation((sub: Subscription) => ownerApi.renewSubscription(sub.id, true));
  const resumeMut = useOwnerMutation((sub: Subscription) => ownerApi.resumeSubscription(sub.id));
  const changeMut = useOwnerMutation(() => ownerApi.changeSubscriptionPlan(id, { planId: Number(targetPlanId), reason: reason || 'Plan changed', generateInvoice: true }));
  const extendMut = useOwnerMutation(() => ownerApi.extendSubscription(id, { days, reason }));
  const pauseMut = useOwnerMutation(() => ownerApi.pauseSubscription(id, reason));
  const cancelMut = useOwnerMutation(() => ownerApi.cancelSubscription(id, { reason, immediate: false }));

  const sub = detail.data;
  const runImmediate = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : errorMessage(error));
    }
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      if (action === 'change') await changeMut.mutateAsync(undefined);
      if (action === 'extend') await extendMut.mutateAsync(undefined);
      if (action === 'pause') await pauseMut.mutateAsync(undefined);
      if (action === 'cancel') await cancelMut.mutateAsync(undefined);
      setAction(null);
      setReason('');
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sub ? `${sub.institution?.name} — ${sub.plan?.name}` : 'Subscription details'}</DialogTitle>
          <DialogDescription>Effective-dated entitlements and lifecycle event history.</DialogDescription>
        </DialogHeader>

        {detail.isPending ? <LoadingRows rows={3} /> : null}
        {detail.isError ? <ErrorState error={detail.error} /> : null}

        {sub ? (
          <div className="space-y-4">
            {actionError ? (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <CommercialStatusBadge status={sub.status} />
              <Badge variant="secondary">v{sub.planVersionNumber ?? 1}</Badge>
              <span className="text-sm font-medium">{formatMoney(sub.amount, sub.currency)} / {sub.billingCycle}</span>
              <span className="text-xs text-muted-foreground">Period ends {formatDate(sub.endAt)}</span>
            </div>

            {canManage && sub.status !== 'cancelled' ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setAction('change')}>
                  <Repeat size={13} /> Change plan
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAction('extend')}>
                  <CalendarPlus size={13} /> Extend term
                </Button>
                <Button size="sm" variant="outline" onClick={() => void runImmediate(() => renewMut.mutateAsync(sub))}>
                  <RefreshCw size={13} /> Renew now
                </Button>
                {sub.status === 'paused' ? (
                  <Button size="sm" variant="outline" onClick={() => void runImmediate(() => resumeMut.mutateAsync(sub))}>
                    <PlayCircle size={13} /> Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setAction('pause')}>
                    <PauseCircle size={13} /> Pause
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => setAction('cancel')}>
                  <XCircle size={13} /> Cancel
                </Button>
              </div>
            ) : null}

            {action ? (
              <form onSubmit={(e) => void submitForm(e)} className="space-y-3 rounded-lg border border-border p-3">
                {action === 'change' ? (
                  <Field label="Target plan">
                    <Select required value={targetPlanId} onChange={(e) => setTargetPlanId(e.target.value)}>
                      <option value="">Select plan...</option>
                      {plans.data?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.currentVersion ? formatMoney(p.currentVersion.price, p.currentVersion.currency) : ''})
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {action === 'extend' ? (
                  <Field label="Extension days">
                    <Input type="number" min={1} max={365} required value={days} onChange={(e) => setDays(Number(e.target.value))} />
                  </Field>
                ) : null}
                <Field label="Reason">
                  <Input required={action !== 'change'} placeholder="Reason for audit trail..." value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Confirm</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
                </div>
              </form>
            ) : null}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Entitlement snapshot</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(sub.entitlementSnapshot?.features ?? {}).map(([key, enabled]) => (
                  <Badge key={key} variant={enabled ? 'info' : 'secondary'} className={enabled ? '' : 'opacity-45'}>
                    {key.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifecycle timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border text-xs">
                  {sub.events?.map((ev) => (
                    <li key={ev.id} className="flex items-start justify-between gap-3 py-2">
                      <div>
                        <span className="font-medium capitalize">{ev.eventType.replace(/_/g, ' ')}</span>
                        {ev.reason ? <span className="block text-muted-foreground">{ev.reason}</span> : null}
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        {ev.actor ? `${ev.actor} · ` : ''}
                        {formatDateTime(ev.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

