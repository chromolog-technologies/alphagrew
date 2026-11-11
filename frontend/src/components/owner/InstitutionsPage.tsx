/** Institutions (SRS FR-IN): directory, onboarding with a first admin, profile, verification and lifecycle. */
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, ImagePlus, Plus, Search, Trash2 } from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { ApiError, downloadFile } from '../../api/http';
import {
  institutionStatusLabels,
  ownerApi,
  OWNER,
  REASON_REQUIRED,
  useInstitution,
  useInstitutionHistory,
  useInstitutionSettings,
  useInstitutions,
  useOwnerMutation,
  verificationLabels,
  type CreateInstitutionInput,
  type InstitutionDetail,
  type InstitutionStatus,
  type VerificationStatus,
} from '../../api/ownerApi';
import {
  actionLabel,
  EmptyState,
  ErrorState,
  errorMessage,
  Field,
  formatDate,
  formatDateTime,
  InstitutionStatusBadge,
  KpiCard,
  LoadingRows,
  PageHeader,
  Pagination,
  VerificationBadge,
} from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const TYPES = ['college', 'university', 'institute', 'school', 'training_centre'];
const typeLabel = (type: string | null) => (type ? type.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—');

export function InstitutionsPage(props: OwnerPageProps) {
  return props.id ? <InstitutionDetailView {...props} id={props.id} /> : <InstitutionList {...props} />;
}

function InstitutionList({ can, go }: OwnerPageProps) {
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [verification, setVerification] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [sort, setSort] = useState('created_at');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [exportError, setExportError] = useState('');

  const query = { search, status, verification, institutionType: institutionType || undefined, sort, page, perPage: 20 };
  const list = useInstitutions(query);

  const exportCsv = async () => {
    setExportError('');
    try {
      await downloadFile('/owner/institutions/export', { search, status, verification, institutionType: institutionType || undefined, sort }, 'institutions.csv');
    } catch (error) {
      setExportError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Institutions"
        description="Every tenant on the platform, its lifecycle status and verification."
        actions={
          <>
            {can(OWNER.institutionsExport) ? (
              <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
                <Download size={14} /> Export CSV
              </Button>
            ) : null}
            {can(OWNER.institutionsCreate) ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} /> Add institution
              </Button>
            ) : null}
          </>
        }
      />
      {exportError ? (
        <Alert variant="destructive">
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_150px_150px_140px]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search institutions"
                placeholder="Search name, code or email"
                className="pl-8"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select aria-label="Institution type" value={institutionType} onChange={(event) => (setInstitutionType(event.target.value), setPage(1))}>
              <option value="">All types</option>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </Select>
            <Select aria-label="Status" value={status} onChange={(event) => (setStatus(event.target.value), setPage(1))}>
              <option value="">All statuses</option>
              {Object.entries(institutionStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select aria-label="Verification" value={verification} onChange={(event) => (setVerification(event.target.value), setPage(1))}>
              <option value="">Any verification</option>
              {Object.entries(verificationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="created_at">Newest first</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="code">Code</option>
            </Select>
          </div>

          {list.isPending ? <LoadingRows /> : null}
          {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
          {list.data?.data.length === 0 ? <EmptyState title="No institutions match" description="Change the filters or add an institution." /> : null}
          {list.data && list.data.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.data.map((institution) => (
                    <TableRow key={institution.id} className="cursor-pointer" onClick={() => go(`institutions/${institution.id}`)}>
                      <TableCell>
                        <button type="button" className="text-left" onClick={() => go(`institutions/${institution.id}`)}>
                          <span className="block font-medium text-foreground">{institution.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {institution.code}
                            {institution.state ? ` · ${institution.state}` : ''}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>{typeLabel(institution.type)}</TableCell>
                      <TableCell>
                        <InstitutionStatusBadge status={institution.status} />
                        {institution.status === 'trial' && institution.trialEndsAt ? (
                          <span className="mt-1 block text-2xs text-muted-foreground">ends {formatDate(institution.trialEndsAt)}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <VerificationBadge status={institution.verificationStatus} />
                      </TableCell>
                      <TableCell className="text-right">{institution.usersCount ?? '—'}</TableCell>
                      <TableCell className="text-right">{institution.studentsCount ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(institution.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <Pagination meta={list.data?.meta} onPage={setPage} />
        </CardContent>
      </Card>

      {creating ? <CreateInstitutionDialog onClose={() => setCreating(false)} onCreated={(id) => go(`institutions/${id}`)} /> : null}
    </div>
  );
}

const EMPTY: CreateInstitutionInput = {
  name: '',
  code: '',
  institutionType: 'college',
  officialEmail: '',
  contactPhone: '',
  country: 'India',
  state: '',
  district: '',
  address: '',
  pincode: '',
  website: '',
  registrationNumber: '',
  status: 'trial',
  adminName: '',
  adminEmail: '',
};

function CreateInstitutionDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [form, setForm] = useState<CreateInstitutionInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const create = useOwnerMutation(ownerApi.createInstitution);
  const set = (key: keyof CreateInstitutionInput) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '')) as unknown as CreateInstitutionInput;
    try {
      const created = await create.mutateAsync(payload);
      onCreated(created.id);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.firstFieldErrors);
      setMessage(errorMessage(error));
    }
  };

  const text = (key: keyof CreateInstitutionInput, label: string, props: { type?: string; required?: boolean; hint?: string } = {}) => (
    <Field label={label} htmlFor={`inst-${key}`} error={errors[key]} hint={props.hint}>
      <Input id={`inst-${key}`} type={props.type ?? 'text'} required={props.required} value={String(form[key] ?? '')} onChange={set(key)} />
    </Field>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={onClose}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add institution</DialogTitle>
            <DialogDescription>The first institution admin gets an email with a link to set their password.</DialogDescription>
          </DialogHeader>
          {message ? (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {text('name', 'Institution name', { required: true })}
            {text('code', 'Code', { required: true, hint: 'Letters, numbers, - and _. Stored in capitals.' })}
            <Field label="Type" htmlFor="inst-type" error={errors.institutionType}>
              <Select id="inst-type" value={form.institutionType} onChange={set('institutionType')}>
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start as" htmlFor="inst-status" error={errors.status}>
              <Select id="inst-status" value={form.status} onChange={set('status')}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
              </Select>
            </Field>
            {text('officialEmail', 'Official email', { type: 'email', required: true })}
            {text('contactPhone', 'Contact phone', { required: true })}
            {text('registrationNumber', 'Registration number')}
            {text('website', 'Website', { type: 'url' })}
            {text('country', 'Country', { required: true })}
            {text('state', 'State', { required: true })}
            {text('district', 'District')}
            {text('pincode', 'PIN code')}
          </div>
          {text('address', 'Address', { required: true })}
          <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            <p className="text-xs font-semibold text-foreground sm:col-span-2">First institution admin</p>
            {text('adminName', 'Name', { required: true })}
            {text('adminEmail', 'Email', { type: 'email', required: true })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create institution'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstitutionDetailView({ id, can, go }: OwnerPageProps & { id: number }) {
  const detail = useInstitution(id);
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState<'status' | 'verify' | null>(null);
  const [logoError, setLogoError] = useState('');
  const uploadLogo = useOwnerMutation((file: File) => ownerApi.uploadInstitutionLogo(id, file));
  const deleteLogo = useOwnerMutation(() => ownerApi.deleteInstitutionLogo(id));

  if (detail.isPending) return <LoadingRows rows={6} />;
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const institution = detail.data;

  const onLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoError('');
    try {
      await uploadLogo.mutateAsync(file);
    } catch (caught) {
      setLogoError(errorMessage(caught));
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => go('institutions')}>
        <ArrowLeft size={14} /> All institutions
      </Button>
      <PageHeader
        title={institution.name}
        description={`${institution.code} · ${typeLabel(institution.type)}${institution.state ? ` · ${institution.state}` : ''}`}
        actions={
          <>
            {can(OWNER.institutionsVerify) ? (
              <Button variant="outline" size="sm" onClick={() => setDialog('verify')}>
                Verification
              </Button>
            ) : null}
            {can(OWNER.institutionsSuspend) && institution.allowedTransitions.length > 0 ? (
              <Button size="sm" onClick={() => setDialog('status')}>
                Change status
              </Button>
            ) : null}
          </>
        }
      />

      {logoError ? (
        <Alert variant="destructive">
          <AlertDescription>{logoError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {institution.logoUrl ? (
          <img src={institution.logoUrl} alt={`${institution.name} logo`} className="h-10 w-10 rounded-lg border border-border object-cover" />
        ) : null}
        <InstitutionStatusBadge status={institution.status} />
        <VerificationBadge status={institution.verificationStatus} />
        {institution.status === 'trial' && institution.trialEndsAt ? (
          <span className="text-xs text-muted-foreground">Trial ends {formatDate(institution.trialEndsAt)}</span>
        ) : null}
        {can(OWNER.institutionsEdit) ? (
          <div className="ml-auto flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
              <ImagePlus size={13} /> {uploadLogo.isPending ? 'Uploading…' : institution.logoUrl ? 'Replace logo' : 'Upload logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onLogoSelected(e)} />
            </label>
            {institution.logoUrl ? (
              <Button variant="ghost" size="sm" disabled={deleteLogo.isPending} onClick={() => void deleteLogo.mutateAsync(undefined)}>
                <Trash2 size={13} /> Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {institution.status === 'suspended' ? (
        <Alert variant="warning">
          <AlertDescription>
            Suspended {formatDateTime(institution.suspendedAt)}
            {institution.suspensionReason ? `: ${institution.suspensionReason}` : ''}. Its users cannot sign in; its data is kept.
          </AlertDescription>
        </Alert>
      ) : null}
      {institution.scheduledChange ? (
        <Alert variant="info">
          <AlertDescription>
            Scheduled: becomes {institutionStatusLabels[institution.scheduledChange.to]} on {formatDateTime(institution.scheduledChange.effectiveAt)}
            {institution.scheduledChange.reason ? ` (${institution.scheduledChange.reason})` : ''}.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Campuses" value={institution.counts.campuses} />
            <KpiCard label="Departments" value={institution.counts.departments} />
            <KpiCard label="Students" value={institution.counts.students} />
            <KpiCard label="Staff" value={institution.counts.staff} />
            <KpiCard label="Admins" value={institution.counts.admins} />
            <KpiCard label="AI requests (30 days)" value={institution.aiUsage30d.calls} hint={`≈ $${institution.aiUsage30d.estimatedCostUsd.toFixed(2)}`} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active subscription</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {institution.subscription ? (institution.subscription.planName ?? institution.subscription.planCode ?? 'Assigned') : 'No subscription'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {institution.subscription
                      ? `${institution.subscription.status.replace('_', ' ')} · ${institution.subscription.currency ?? ''} ${(institution.subscription.amount ?? 0).toLocaleString()} / ${institution.subscription.billingCycle}${institution.subscription.renewalAt ? ` · Renews ${new Date(institution.subscription.renewalAt).toLocaleDateString()}` : ''}`
                      : 'Assign a plan under SaaS & Revenue → Subscriptions'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => go('subscriptions')}>
                  Subscriptions
                </Button>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">AI credit wallet</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {institution.aiCreditWallet ? `${institution.aiCreditWallet.balance.toLocaleString()} credits` : 'Not funded'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {institution.aiCreditWallet
                      ? `${institution.aiCreditWallet.consumedTotal.toLocaleString()} consumed of ${institution.aiCreditWallet.allocatedTotal.toLocaleString()} allocated`
                      : 'Manage credit grants and quotas under AI & Intelligence → AI & credits'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => go('ai')}>
                  AI credits
                </Button>
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Institution admins</CardTitle>
            </CardHeader>
            <CardContent>
              {institution.admins.length === 0 ? <EmptyState title="No institution admin" description="Nobody can manage this institution yet." /> : null}
              <ul className="divide-y divide-border">
                {institution.admins.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <button type="button" className="text-left" onClick={() => can(OWNER.usersView) && go(`users/${admin.id}`)}>
                      <span className="block font-medium">{admin.name}</span>
                      <span className="block text-xs text-muted-foreground">{admin.email}</span>
                    </button>
                    <span className="text-xs text-muted-foreground">Last sign-in {formatDateTime(admin.lastLoginAt)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profile" className="pt-4">
          <ProfileCard institution={institution} editable={can(OWNER.institutionsEdit)} />
        </TabsContent>
        <TabsContent value="overrides" className="pt-4">
          <SettingsOverridesCard id={institution.id} editable={can(OWNER.institutionsEdit)} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryCard id={institution.id} />
        </TabsContent>
      </Tabs>

      {dialog === 'status' ? <StatusDialog institution={institution} onClose={() => setDialog(null)} /> : null}
      {dialog === 'verify' ? <VerifyDialog institution={institution} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function SettingsOverridesCard({ id, editable }: { id: number; editable: boolean }) {
  const query = useInstitutionSettings(id);
  const save = useOwnerMutation((input: Record<string, unknown>) => ownerApi.saveInstitutionSettings(id, input));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  if (query.isPending) return <LoadingRows rows={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { overrides, allowedKeys, defaults } = query.data;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice('');
    setErr('');
    const payload: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (draft[key] !== undefined) {
        const val = draft[key].trim();
        payload[key] = val === '' ? null : key === 'maxUploadMb' || key === 'sessionTimeoutMinutes' ? Number(val) : val;
      }
    }
    try {
      await save.mutateAsync(payload);
      setNotice('Institution overrides saved.');
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Tenant configuration overrides</CardTitle>
          <Badge variant="secondary">Inherits platform defaults when blank</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {notice ? (
            <Alert variant="success">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {err ? (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {allowedKeys.map((key) => {
              const value = draft[key] ?? (overrides[key] !== undefined && overrides[key] !== null ? String(overrides[key]) : '');
              return (
                <Field key={key} label={key} htmlFor={`ovr-${key}`} hint={`Platform default: ${String(defaults[key] ?? '—')}`}>
                  <Input
                    id={`ovr-${key}`}
                    disabled={!editable}
                    placeholder={`Inherit (${String(defaults[key] ?? 'default')})`}
                    value={value}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </Field>
              );
            })}
          </div>
          {editable ? (
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save overrides'}
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

const PROFILE_FIELDS: [keyof InstitutionDetail, string, string][] = [
  ['name', 'name', 'Name'],
  ['registrationNumber', 'registrationNumber', 'Registration number'],
  ['officialEmail', 'officialEmail', 'Official email'],
  ['contactPhone', 'contactPhone', 'Contact phone'],
  ['website', 'website', 'Website'],
  ['country', 'country', 'Country'],
  ['state', 'state', 'State'],
  ['district', 'district', 'District'],
  ['address', 'address', 'Address'],
  ['pincode', 'pincode', 'PIN code'],
];

function ProfileCard({ institution, editable }: { institution: InstitutionDetail; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useOwnerMutation((input: Record<string, string>) => ownerApi.updateInstitution(institution.id, input));

  const start = () => {
    setForm(Object.fromEntries(PROFILE_FIELDS.map(([key, input]) => [input, String(institution[key] ?? '')])));
    setErrors({});
    setEditing(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      // Cleared optional fields are sent as '' and saved as null (Laravel's ConvertEmptyStringsToNull).
      await update.mutateAsync(form);
      setEditing(false);
    } catch (error) {
      setErrors(error instanceof ApiError ? { ...error.firstFieldErrors, _: error.message } : { _: errorMessage(error) });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Profile</CardTitle>
        {editable && !editing ? (
          <Button size="sm" variant="outline" onClick={start}>
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={(event) => void save(event)} className="space-y-3">
            {errors._ ? (
              <Alert variant="destructive">
                <AlertDescription>{errors._}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFILE_FIELDS.map(([, input, label]) => (
                <Field key={input} label={label} htmlFor={`edit-${input}`} error={errors[input]}>
                  <Input id={`edit-${input}`} value={form[input] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [input]: event.target.value }))} />
                </Field>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {PROFILE_FIELDS.map(([key, , label]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-foreground">{String(institution[key] ?? '—') || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryCard({ id }: { id: number }) {
  const history = useInstitutionHistory(id);
  if (history.isPending) return <LoadingRows />;
  if (history.isError) return <ErrorState error={history.error} />;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status and verification</CardTitle>
        </CardHeader>
        <CardContent>
          {history.data.status.length === 0 ? <EmptyState title="No changes yet" /> : null}
          <ol className="space-y-3">
            {history.data.status.map((event) => (
              <li key={event.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                <p className="font-medium">
                  {event.kind === 'verification' ? 'Verification' : 'Status'}: {event.from ? `${event.from} → ` : ''}
                  {event.to}
                  {!event.applied ? ' (scheduled)' : ''}
                </p>
                {event.reason ? <p className="text-muted-foreground">{event.reason}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {event.actor ?? 'System'} · {formatDateTime(event.effectiveAt ?? event.at)}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {history.data.audit.length === 0 ? <EmptyState title="No audit entries" /> : null}
          <ul className="divide-y divide-border">
            {history.data.audit.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="block font-medium">{actionLabel(entry.action)}</span>
                  <span className="block text-xs text-muted-foreground">{entry.actor ?? 'System'}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatusDialog({ institution, onClose }: { institution: InstitutionDetail; onClose: () => void }) {
  const [status, setStatus] = useState<InstitutionStatus>(institution.allowedTransitions[0]);
  const [reason, setReason] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [error, setError] = useState('');
  const change = useOwnerMutation((input: { status: InstitutionStatus; reason?: string; effectiveAt?: string }) => ownerApi.changeInstitutionStatus(institution.id, input));
  const needsReason = REASON_REQUIRED.includes(status);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (needsReason && !reason.trim()) {
      setError('Give a reason for this change.');
      return;
    }
    if (when === 'later' && !effectiveAt) {
      setError('Choose when the change takes effect.');
      return;
    }
    try {
      await change.mutateAsync({
        status,
        reason: reason.trim() || undefined,
        effectiveAt: when === 'later' ? new Date(effectiveAt).toISOString() : undefined,
      });
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Currently {institutionStatusLabels[institution.status]}. Suspending blocks every user of {institution.name} at once; nothing is deleted. The
              institution admins are told by email.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="New status" htmlFor="status-to">
            <Select id="status-to" value={status} onChange={(event) => setStatus(event.target.value as InstitutionStatus)}>
              {institution.allowedTransitions.map((option) => (
                <option key={option} value={option}>
                  {institutionStatusLabels[option]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={needsReason ? 'Reason (required)' : 'Reason'} htmlFor="status-reason">
            <Input id="status-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <fieldset className="space-y-2 text-sm">
            <legend className="text-xs font-medium">Takes effect</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="when" checked={when === 'now'} onChange={() => setWhen('now')} /> Now
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="when" checked={when === 'later'} onChange={() => setWhen('later')} /> On a date
            </label>
            {when === 'later' ? <Input type="datetime-local" aria-label="Effective date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /> : null}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={status === 'suspended' || status === 'closed' ? 'destructive' : 'default'} disabled={change.isPending}>
              {when === 'later' ? 'Schedule' : 'Apply'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VerifyDialog({ institution, onClose }: { institution: InstitutionDetail; onClose: () => void }) {
  const [status, setStatus] = useState<VerificationStatus>('verified');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const verify = useOwnerMutation((input: { status: VerificationStatus; note?: string }) => ownerApi.verifyInstitution(institution.id, input));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await verify.mutateAsync({ status, note: note.trim() || undefined });
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Verification</DialogTitle>
            <DialogDescription>Currently {verificationLabels[institution.verificationStatus]}.</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Decision" htmlFor="verify-status">
            <Select id="verify-status" value={status} onChange={(event) => setStatus(event.target.value as VerificationStatus)}>
              {Object.entries(verificationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note" htmlFor="verify-note" hint="Required when rejecting or asking for more information.">
            <Input id="verify-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={verify.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
