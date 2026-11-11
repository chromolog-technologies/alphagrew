/** Plans & feature entitlements (SRS §5.6): catalog, immutable versioning, limits & cloning. */
import { useState, type FormEvent } from 'react';
import { Archive, CheckCircle2, Copy, Edit3, History, Plus, Trash2 } from 'lucide-react';
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
import { ApiError } from '../../api/http';
import {
  ownerApi,
  OWNER,
  useOwnerMutation,
  usePlan,
  usePlans,
  type BillingCycle,
  type Plan,
  type PlanInput,
} from '../../api/ownerApi';
import { CommercialStatusBadge, EmptyState, ErrorState, Field, formatDateTime, formatMoney, LoadingRows, PageHeader, errorMessage } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const FEATURE_META: { key: string; label: string }[] = [
  { key: 'placement', label: 'Placement' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'resume_ai', label: 'Resume AI' },
  { key: 'ai_interviews', label: 'AI Interviews' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'api_access', label: 'API Access' },
  { key: 'custom_branding', label: 'Custom Branding' },
];

export function PlansPage({ can }: OwnerPageProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [versionsFor, setVersionsFor] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const plans = usePlans(statusFilter ? { status: statusFilter } : {});
  const canManage = can(OWNER.plansManage);

  const cloneMut = useOwnerMutation((plan: Plan) => ownerApi.clonePlan(plan.id));
  const publishMut = useOwnerMutation((plan: Plan) => ownerApi.publishPlan(plan.id));
  const archiveMut = useOwnerMutation((plan: Plan) => ownerApi.archivePlan(plan.id));
  const deleteMut = useOwnerMutation((plan: Plan) => ownerApi.deletePlan(plan.id));

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans & feature entitlements"
        description="Manage subscription tiers, limits and feature gates. Updating commercial terms publishes a new version while preserving existing subscriptions."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus size={14} /> New plan
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select className="w-44" aria-label="Filter plan status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {plans.isError ? <ErrorState error={plans.error} onRetry={() => void plans.refetch()} /> : null}
      {plans.isPending ? <LoadingRows rows={4} /> : null}
      {plans.data && plans.data.length === 0 ? (
        <EmptyState title="No plans found" description="Create your first subscription plan to begin assigning tenant entitlements." />
      ) : null}

      {plans.data && plans.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.data.map((plan) => {
            const v = plan.currentVersion;
            return (
              <Card key={plan.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xs font-mono uppercase tracking-wider text-muted-foreground">
                        {plan.code} · v{v?.versionNumber ?? 1} · {plan.isPublic ? 'Public' : 'Private'}
                      </p>
                      <CardTitle className="mt-0.5 text-base">{plan.name}</CardTitle>
                    </div>
                    <CommercialStatusBadge status={plan.status} />
                  </div>
                  {plan.description ? <p className="text-xs text-muted-foreground">{plan.description}</p> : null}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      {v ? formatMoney(v.price, v.currency) : '—'}
                      <span className="text-xs font-normal text-muted-foreground"> / {v?.billingCycle ?? 'monthly'}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Setup fee: {v ? formatMoney(v.setupFee, v.currency) : '—'} · Trial: {v?.trialDays ?? 0} days
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Students</span>
                    <span className="text-right font-medium">{v?.studentLimit ?? 'Unlimited'}</span>
                    <span className="text-muted-foreground">Faculty</span>
                    <span className="text-right font-medium">{v?.facultyLimit ?? 'Unlimited'}</span>
                    <span className="text-muted-foreground">Campuses / Depts</span>
                    <span className="text-right font-medium">
                      {v?.campusLimit ?? '∞'} / {v?.departmentLimit ?? '∞'}
                    </span>
                    <span className="text-muted-foreground">Recruiters</span>
                    <span className="text-right font-medium">{v?.recruiterLimit ?? 'Unlimited'}</span>
                    <span className="text-muted-foreground">API requests / mo</span>
                    <span className="text-right font-medium">{v?.apiRequestsLimit?.toLocaleString() ?? 'Unlimited'}</span>
                    <span className="text-muted-foreground">Storage</span>
                    <span className="text-right font-medium">{v ? `${Math.round(v.storageLimitMb / 1024)} GB` : '—'}</span>
                    <span className="text-muted-foreground">AI credits ({v?.aiCreditResetPeriod ?? 'monthly'})</span>
                    <span className="text-right font-medium">{v?.aiCreditAllocation?.toLocaleString() ?? 0}</span>
                    <span className="text-muted-foreground">Subscriptions</span>
                    <span className="text-right font-medium">{plan.activeSubscriptionsCount} active ({plan.subscriptionsCount} total)</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {FEATURE_META.map((feat) => {
                      const enabled = Boolean(v?.features?.[feat.key]);
                      return (
                        <Badge key={feat.key} variant={enabled ? 'info' : 'secondary'} className={enabled ? '' : 'opacity-45'}>
                          {feat.label}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                    <Button size="sm" variant="outline" onClick={() => setVersionsFor(plan.id)}>
                      <History size={12} /> Versions
                    </Button>
                    {canManage ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditing(plan)}>
                          <Edit3 size={12} /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void runAction(() => cloneMut.mutateAsync(plan))}>
                          <Copy size={12} /> Clone
                        </Button>
                        {plan.status !== 'active' ? (
                          <Button size="sm" variant="outline" onClick={() => void runAction(() => publishMut.mutateAsync(plan))}>
                            <CheckCircle2 size={12} /> Publish
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void runAction(() => archiveMut.mutateAsync(plan))}>
                            <Archive size={12} /> Archive
                          </Button>
                        )}
                        {plan.subscriptionsCount === 0 ? (
                          <Button size="sm" variant="ghost" onClick={() => void runAction(() => deleteMut.mutateAsync(plan))}>
                            <Trash2 size={12} /> Delete
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {editing ? <PlanEditorDialog plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {versionsFor ? <PlanVersionsDialog planId={versionsFor} onClose={() => setVersionsFor(null)} /> : null}
    </div>
  );
}

function PlanVersionsDialog({ planId, onClose }: { planId: number; onClose: () => void }) {
  const detail = usePlan(planId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{detail.data ? `${detail.data.name} — Version history` : 'Plan version history'}</DialogTitle>
          <DialogDescription>Each commercial edit publishes an immutable snapshot so active contracts keep their agreed terms.</DialogDescription>
        </DialogHeader>
        {detail.isPending ? <LoadingRows rows={3} /> : null}
        {detail.isError ? <ErrorState error={detail.error} /> : null}
        {detail.data?.versions ? (
          <div className="space-y-3">
            {detail.data.versions.map((ver) => (
              <Card key={ver.id}>
                <CardContent className="space-y-2 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      v{ver.versionNumber} · {formatMoney(ver.price, ver.currency)} / {ver.billingCycle}
                    </span>
                    <div className="flex items-center gap-2">
                      {ver.isCurrent ? <Badge variant="success">Current</Badge> : <Badge variant="secondary">Historical</Badge>}
                      <span className="text-muted-foreground">{formatDateTime(ver.publishedAt)}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Setup {formatMoney(ver.setupFee, ver.currency)} · Trial {ver.trialDays}d · AI credits {ver.aiCreditAllocation.toLocaleString()} ({ver.aiCreditResetPeriod}) · Students {ver.studentLimit ?? '∞'} · Faculty {ver.facultyLimit ?? '∞'} · Campuses {ver.campusLimit ?? '∞'} · Depts {ver.departmentLimit ?? '∞'} · Recruiters {ver.recruiterLimit ?? '∞'} · Storage {ver.storageLimitMb} MB
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanEditorDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const isNew = !plan;
  const v = plan?.currentVersion;

  const [form, setForm] = useState<PlanInput>({
    code: plan?.code ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    status: plan?.status ?? 'active',
    sortOrder: plan?.sortOrder ?? 0,
    isPublic: plan?.isPublic ?? true,
    billingCycle: (v?.billingCycle ?? 'monthly') as BillingCycle,
    price: v?.price ?? 9999,
    setupFee: v?.setupFee ?? 0,
    currency: v?.currency ?? 'INR',
    trialDays: v?.trialDays ?? 14,
    studentLimit: v?.studentLimit ?? 1000,
    facultyLimit: v?.facultyLimit ?? 100,
    campusLimit: v?.campusLimit ?? 1,
    departmentLimit: v?.departmentLimit ?? 10,
    recruiterLimit: v?.recruiterLimit ?? 25,
    storageLimitMb: v?.storageLimitMb ?? 10240,
    apiRequestsLimit: v?.apiRequestsLimit ?? 50000,
    aiCreditAllocation: v?.aiCreditAllocation ?? 2000,
    aiCreditResetPeriod: v?.aiCreditResetPeriod ?? 'monthly',
    features: {
      placement: Boolean(v?.features?.placement ?? true),
      assessments: Boolean(v?.features?.assessments ?? true),
      resume_ai: Boolean(v?.features?.resume_ai ?? true),
      ai_interviews: Boolean(v?.features?.ai_interviews ?? false),
      analytics: Boolean(v?.features?.analytics ?? true),
      api_access: Boolean(v?.features?.api_access ?? false),
      custom_branding: Boolean(v?.features?.custom_branding ?? false),
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMut = useOwnerMutation((input: PlanInput) => ownerApi.createPlan(input));
  const updateMut = useOwnerMutation((input: Partial<PlanInput>) => ownerApi.updatePlan(plan!.id, input));
  const saving = createMut.isPending || updateMut.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    try {
      if (isNew) {
        await createMut.mutateAsync(form);
      } else {
        const { code: _ignored, ...rest } = form;
        await updateMut.mutateAsync(rest);
      }
      onClose();
    } catch (error) {
      setErrors(error instanceof ApiError ? { ...error.firstFieldErrors, _: error.message } : { _: errorMessage(error) });
    }
  };

  const optInt = (val: string) => (val === '' ? null : Number(val));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Create subscription plan' : `Edit ${plan.name} (creates v${(v?.versionNumber ?? 1) + 1})`}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Define pricing, limits and enabled modules for tenants.'
              : 'Existing subscriptions keep their contracted version snapshot unless explicitly migrated.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {errors._ ? (
            <Alert variant="destructive">
              <AlertDescription>{errors._}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {isNew ? (
              <Field label="Plan code" error={errors.code} hint="Uppercase identifier, e.g. GROWTH">
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </Field>
            ) : null}
            <Field label="Plan name" error={errors.name}>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Billing cycle" error={errors.billingCycle}>
              <Select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as BillingCycle })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
            <Field label="Currency" error={errors.currency}>
              <Input required maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Price" error={errors.price}>
              <Input type="number" min={0} step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </Field>
            <Field label="Setup fee" error={errors.setupFee}>
              <Input type="number" min={0} step="0.01" required value={form.setupFee} onChange={(e) => setForm({ ...form, setupFee: Number(e.target.value) })} />
            </Field>
            <Field label="Trial days" error={errors.trialDays}>
              <Input type="number" min={0} max={365} required value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} />
            </Field>
            <Field label="Sort order" error={errors.sortOrder}>
              <Input type="number" min={0} value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </Field>
            <Field label="AI credit allocation" error={errors.aiCreditAllocation}>
              <Input
                type="number"
                min={0}
                required
                value={form.aiCreditAllocation}
                onChange={(e) => setForm({ ...form, aiCreditAllocation: Number(e.target.value) })}
              />
            </Field>
            <Field label="AI credit reset period" error={errors.aiCreditResetPeriod}>
              <Select
                value={form.aiCreditResetPeriod}
                onChange={(e) => setForm({ ...form, aiCreditResetPeriod: e.target.value as 'monthly' | 'yearly' | 'none' })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="none">One-time / None</option>
              </Select>
            </Field>
            <Field label="Student limit (blank = unlimited)">
              <Input type="number" min={0} value={form.studentLimit ?? ''} onChange={(e) => setForm({ ...form, studentLimit: optInt(e.target.value) })} />
            </Field>
            <Field label="Faculty limit (blank = unlimited)">
              <Input type="number" min={0} value={form.facultyLimit ?? ''} onChange={(e) => setForm({ ...form, facultyLimit: optInt(e.target.value) })} />
            </Field>
            <Field label="Campus limit (blank = unlimited)">
              <Input type="number" min={0} value={form.campusLimit ?? ''} onChange={(e) => setForm({ ...form, campusLimit: optInt(e.target.value) })} />
            </Field>
            <Field label="Department limit (blank = unlimited)">
              <Input type="number" min={0} value={form.departmentLimit ?? ''} onChange={(e) => setForm({ ...form, departmentLimit: optInt(e.target.value) })} />
            </Field>
            <Field label="Recruiter limit (blank = unlimited)">
              <Input type="number" min={0} value={form.recruiterLimit ?? ''} onChange={(e) => setForm({ ...form, recruiterLimit: optInt(e.target.value) })} />
            </Field>
            <Field label="API requests limit / mo (blank = unlimited)">
              <Input type="number" min={0} value={form.apiRequestsLimit ?? ''} onChange={(e) => setForm({ ...form, apiRequestsLimit: optInt(e.target.value) })} />
            </Field>
            <Field label="Storage limit (MB)">
              <Input type="number" min={0} required value={form.storageLimitMb} onChange={(e) => setForm({ ...form, storageLimitMb: Number(e.target.value) })} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={Boolean(form.isPublic ?? true)} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
                <span>Public plan (visible on pricing catalog)</span>
              </label>
            </div>
          </div>

          <Field label="Description">
            <Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Feature entitlements</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEATURE_META.map((feat) => (
                <label key={feat.key} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(form.features[feat.key])}
                    onChange={(e) => setForm({ ...form, features: { ...form.features, [feat.key]: e.target.checked } })}
                  />
                  <span>{feat.label}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create plan' : 'Publish new version'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

