import { useEffect, useMemo, useState } from 'react';
import { ImageUp, Pencil, Plus, Star, Trash2, Users } from 'lucide-react';
import { ApiError } from '../../api/http';
import {
  setupApi,
  setupKeys,
  useBatches,
  useCampuses,
  useInstitutionSettings,
  usePlacementPolicy,
  useSetupMutation,
  useStudentOptions,
  type Batch,
  type BatchInput,
  type Campus,
  type CampusInput,
  type InstitutionSettingsInput,
  type PlacementPolicy,
} from '../../api/setupApi';
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
  Skeleton,
} from '../ui';

type Notice = { tone: 'success' | 'error'; text: string } | null;
type Errors = Record<string, string[]>;

const toErrors = (error: unknown): { message: string; fields: Errors } =>
  error instanceof ApiError ? { message: error.message, fields: error.fieldErrors } : { message: 'Something went wrong. Try again.', fields: {} };

function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

function Field({ id, label, error, hint, children, wide }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function NoticeBar({ notice }: { notice: Notice }) {
  return notice ? <Alert variant={notice.tone === 'error' ? 'destructive' : 'success'}><AlertDescription>{notice.text}</AlertDescription></Alert> : null;
}

// ---------------------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------------------

const emptyBatch = (): BatchInput => {
  const year = new Date().getFullYear();
  return { name: '', code: '', departmentCode: null, courseId: null, admissionYear: year, graduationYear: year + 4, status: 'active' };
};

/** Batches (admission year → graduation year) and their students. Eligibility rules can target a batch. */
export function BatchesModule() {
  const batches = useBatches();
  const [editing, setEditing] = useState<Batch | null | undefined>(undefined);
  const [assigning, setAssigning] = useState<Batch | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const remove = useSetupMutation((id: number) => setupApi.deleteBatch(id), [setupKeys.batches]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Batches"
        description="Groups of students by admission and graduation year. Placement rules can be limited to a batch."
        action={<Button type="button" onClick={() => setEditing(null)}><Plus size={16} /> New batch</Button>}
      />
      <NoticeBar notice={notice} />

      {batches.isPending ? <Skeleton className="h-40" /> : batches.data?.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr><th className="text-left">Batch</th><th className="text-left">Department</th><th className="text-left">Years</th><th className="text-right">Students</th><th className="text-left">Status</th><th className="text-right"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {batches.data.map((batch) => (
                <tr key={batch.id}>
                  <td><p className="font-medium text-foreground">{batch.name}</p><p className="font-mono text-2xs text-muted-foreground">{batch.code}</p></td>
                  <td>{batch.departmentCode ?? 'All'}</td>
                  <td>{batch.admissionYear}–{batch.graduationYear}</td>
                  <td className="text-right tabular-nums">{batch.studentCount ?? 0}</td>
                  <td><Badge variant={batch.status === 'active' ? 'success' : 'secondary'}>{batch.status}</Badge></td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAssigning(batch)}><Users size={14} /> Students</Button>
                      <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${batch.name}`} onClick={() => setEditing(batch)}><Pencil size={15} /></Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${batch.name}`}
                        onClick={() => window.confirm(`Delete ${batch.name}?`) && remove.mutate(batch.id, {
                          onSuccess: () => setNotice({ tone: 'success', text: `${batch.name} deleted.` }),
                          onError: (error) => setNotice({ tone: 'error', text: toErrors(error).message }),
                        })}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No batches yet.</p>
      )}

      <BatchDialog batch={editing} onClose={() => setEditing(undefined)} onSaved={(text) => setNotice({ tone: 'success', text })} />
      <AssignStudentsDialog batch={assigning} onClose={() => setAssigning(null)} onSaved={(text) => setNotice({ tone: 'success', text })} />
    </div>
  );
}

function BatchDialog({ batch, onClose, onSaved }: { batch: Batch | null | undefined; onClose: () => void; onSaved: (text: string) => void }) {
  const [form, setForm] = useState<BatchInput>(emptyBatch());
  const [error, setError] = useState<{ message: string; fields: Errors } | null>(null);
  const save = useSetupMutation((input: BatchInput) => (batch ? setupApi.updateBatch(batch.id, input) : setupApi.createBatch(input)), [setupKeys.batches]);

  useEffect(() => {
    if (batch === undefined) return;
    setError(null);
    setForm(batch ? { name: batch.name, code: batch.code, departmentCode: batch.departmentCode, courseId: batch.courseId, admissionYear: batch.admissionYear, graduationYear: batch.graduationYear, status: batch.status } : emptyBatch());
  }, [batch]);

  return (
    <Dialog open={batch !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(form, { onSuccess: () => { onSaved(`${form.name} saved.`); onClose(); }, onError: (caught) => setError(toErrors(caught)) });
          }}
        >
          <DialogHeader>
            <DialogTitle>{batch ? 'Edit batch' : 'New batch'}</DialogTitle>
            <DialogDescription>The code is used in eligibility rules, for example CSE-2027.</DialogDescription>
          </DialogHeader>
          {error ? <Alert variant="destructive" className="mt-3"><AlertDescription>{error.message}</AlertDescription></Alert> : null}
          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <Field id="batch-name" label="Name" error={error?.fields.name?.[0]}><Input id="batch-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field id="batch-code" label="Code" error={error?.fields.code?.[0]}><Input id="batch-code" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></Field>
            <Field id="batch-department" label="Department code" hint="Leave empty for all departments" error={error?.fields.departmentCode?.[0]}>
              <Input id="batch-department" value={form.departmentCode ?? ''} onChange={(event) => setForm({ ...form, departmentCode: event.target.value.toUpperCase() || null })} />
            </Field>
            <Field id="batch-status" label="Status">
              <select id="batch-status" value={form.status ?? 'active'} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field id="batch-admission" label="Admission year" error={error?.fields.admissionYear?.[0]}><Input id="batch-admission" type="number" value={form.admissionYear} onChange={(event) => setForm({ ...form, admissionYear: Number(event.target.value) })} /></Field>
            <Field id="batch-graduation" label="Graduation year" error={error?.fields.graduationYear?.[0]}><Input id="batch-graduation" type="number" value={form.graduationYear} onChange={(event) => setForm({ ...form, graduationYear: Number(event.target.value) })} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignStudentsDialog({ batch, onClose, onSaved }: { batch: Batch | null; onClose: () => void; onSaved: (text: string) => void }) {
  const students = useStudentOptions(batch !== null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const assign = useSetupMutation((ids: number[]) => setupApi.assignStudents(batch!.id, ids), [setupKeys.batches, setupKeys.students]);

  const options = useMemo(
    () => (students.data ?? []).filter((student) => !batch?.departmentCode || student.departmentCode === batch.departmentCode),
    [students.data, batch],
  );

  useEffect(() => {
    setChosen([]);
    setError(null);
  }, [batch]);

  return (
    <Dialog open={batch !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Students in {batch?.name}</DialogTitle>
          <DialogDescription>Tick students to add them to this batch. A student belongs to one batch at a time.</DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {students.isPending ? <Skeleton className="m-3 h-24" /> : (
            <table className="w-full text-sm">
              <tbody>
                {options.map((student) => (
                  <tr key={student.id}>
                    <td className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Add ${student.name}`}
                        checked={chosen.includes(student.id) || student.batchId === batch?.id}
                        disabled={student.batchId === batch?.id}
                        onChange={(event) => setChosen((ids) => (event.target.checked ? [...ids, student.id] : ids.filter((id) => id !== student.id)))}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td>{student.name}</td>
                    <td className="font-mono text-2xs text-muted-foreground">{student.registrationNumber}</td>
                    <td>{student.departmentCode} · {student.year}</td>
                    <td className="text-2xs text-muted-foreground">{student.batchId === batch?.id ? 'In this batch' : student.batchId ? 'In another batch' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button
            type="button"
            disabled={chosen.length === 0 || assign.isPending}
            onClick={() => assign.mutate(chosen, {
              onSuccess: () => { onSaved(`${chosen.length} students added to ${batch?.name}.`); onClose(); },
              onError: (caught) => setError(toErrors(caught).message),
            })}
          >
            Add {chosen.length || ''} students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------
// Campuses
// ---------------------------------------------------------------------------------------

const emptyCampus = (): CampusInput => ({ name: '', code: '', address: null, city: null, state: null, phone: null, isPrimary: false });

/** The institution's campuses (sites); one is the primary campus. */
export function CampusesModule() {
  const campuses = useCampuses();
  const [editing, setEditing] = useState<Campus | null | undefined>(undefined);
  const [form, setForm] = useState<CampusInput>(emptyCampus());
  const [error, setError] = useState<{ message: string; fields: Errors } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const save = useSetupMutation((input: CampusInput) => (editing ? setupApi.updateCampus(editing.id, input) : setupApi.createCampus(input)), [setupKeys.campuses]);
  const remove = useSetupMutation((id: number) => setupApi.deleteCampus(id), [setupKeys.campuses]);

  const open = (campus: Campus | null) => {
    setEditing(campus);
    setError(null);
    setForm(campus ? { name: campus.name, code: campus.code, address: campus.address, city: campus.city, state: campus.state, phone: campus.phone, isPrimary: campus.isPrimary } : emptyCampus());
  };
  const text = (key: keyof CampusInput) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value || null });

  return (
    <div className="space-y-5">
      <PageHeader title="Campuses" description="Your institution's sites. Mark one as the primary campus." action={<Button type="button" onClick={() => open(null)}><Plus size={16} /> New campus</Button>} />
      <NoticeBar notice={notice} />

      {campuses.isPending ? <Skeleton className="h-40" /> : campuses.data?.length ? (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campuses.data.map((campus) => (
            <article key={campus.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">{campus.name}{campus.isPrimary ? <Star size={14} className="fill-warning text-warning" aria-label="Primary campus" /> : null}</p>
                  <p className="font-mono text-2xs text-muted-foreground">{campus.code}</p>
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${campus.name}`} onClick={() => open(campus)}><Pencil size={15} /></Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${campus.name}`}
                    onClick={() => window.confirm(`Delete ${campus.name}?`) && remove.mutate(campus.id, { onError: (caught) => setNotice({ tone: 'error', text: toErrors(caught).message }) })}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{[campus.address, campus.city, campus.state].filter(Boolean).join(', ') || 'No address'}</p>
              {campus.phone ? <p className="mt-1 text-xs text-muted-foreground">{campus.phone}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No campuses yet.</p>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(value) => !value && setEditing(undefined)}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(form, { onSuccess: () => { setNotice({ tone: 'success', text: `${form.name} saved.` }); setEditing(undefined); }, onError: (caught) => setError(toErrors(caught)) });
            }}
          >
            <DialogHeader><DialogTitle>{editing ? 'Edit campus' : 'New campus'}</DialogTitle></DialogHeader>
            {error ? <Alert variant="destructive" className="mt-3"><AlertDescription>{error.message}</AlertDescription></Alert> : null}
            <div className="grid gap-3 py-4 sm:grid-cols-2">
              <Field id="campus-name" label="Name" error={error?.fields.name?.[0]}><Input id="campus-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field id="campus-code" label="Code" error={error?.fields.code?.[0]}><Input id="campus-code" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></Field>
              <Field id="campus-address" label="Address" wide><Input id="campus-address" value={form.address ?? ''} onChange={text('address')} /></Field>
              <Field id="campus-city" label="City"><Input id="campus-city" value={form.city ?? ''} onChange={text('city')} /></Field>
              <Field id="campus-state" label="State"><Input id="campus-state" value={form.state ?? ''} onChange={text('state')} /></Field>
              <Field id="campus-phone" label="Phone"><Input id="campus-phone" value={form.phone ?? ''} onChange={text('phone')} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm({ ...form, isPrimary: event.target.checked })} className="h-4 w-4 accent-primary" /> Primary campus
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Institution settings
// ---------------------------------------------------------------------------------------

/** Institution profile, branding colours, logo and email sender, saved to the institution. */
export function InstitutionSettingsModule() {
  const settings = useInstitutionSettings();
  const [form, setForm] = useState<InstitutionSettingsInput | null>(null);
  const [error, setError] = useState<{ message: string; fields: Errors } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const save = useSetupMutation((input: InstitutionSettingsInput) => setupApi.updateInstitution(input), [setupKeys.institution]);
  const upload = useSetupMutation((file: File) => setupApi.uploadLogo(file), [setupKeys.institution]);

  useEffect(() => {
    if (!settings.data) return;
    const { id: _id, code: _code, logoUrl: _logo, ...rest } = settings.data;
    setForm(rest);
  }, [settings.data]);

  if (settings.isPending || !form) return <Skeleton className="h-64" />;
  const text = (key: keyof InstitutionSettingsInput) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value || null });

  return (
    <div className="space-y-5">
      <PageHeader title="Institution settings" description={`Profile, branding and email settings for ${settings.data?.name} (code ${settings.data?.code}).`} />
      <NoticeBar notice={notice} />
      {error ? <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert> : null}

      <form
        className="grid gap-5 lg:grid-cols-[1fr_320px]"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          save.mutate(form, { onSuccess: () => setNotice({ tone: 'success', text: 'Settings saved.' }), onError: (caught) => setError(toErrors(caught)) });
        }}
      >
        <section className="grid gap-3 rounded-xl border border-border bg-card p-5 shadow-card sm:grid-cols-2">
          <Field id="inst-name" label="Institution name" error={error?.fields.name?.[0]} wide><Input id="inst-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field id="inst-email" label="Contact email" error={error?.fields.contactEmail?.[0]}><Input id="inst-email" type="email" value={form.contactEmail ?? ''} onChange={text('contactEmail')} /></Field>
          <Field id="inst-phone" label="Contact phone"><Input id="inst-phone" value={form.contactPhone ?? ''} onChange={text('contactPhone')} /></Field>
          <Field id="inst-website" label="Website" error={error?.fields.website?.[0]}><Input id="inst-website" type="url" value={form.website ?? ''} onChange={text('website')} placeholder="https://" /></Field>
          <Field id="inst-address" label="Address"><Input id="inst-address" value={form.address ?? ''} onChange={text('address')} /></Field>
          <Field id="inst-sender" label="Email sender name" hint="Shown as the sender of notification emails"><Input id="inst-sender" value={form.emailSenderName ?? ''} onChange={text('emailSenderName')} /></Field>
          <Field id="inst-reply" label="Reply-to email" error={error?.fields.emailReplyTo?.[0]}><Input id="inst-reply" type="email" value={form.emailReplyTo ?? ''} onChange={text('emailReplyTo')} /></Field>
          <Field id="inst-primary" label="Primary colour" error={error?.fields.primaryColor?.[0]}>
            <div className="flex gap-2"><input type="color" aria-label="Pick primary colour" value={form.primaryColor ?? '#6366f1'} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} className="h-9 w-12 rounded border border-input" /><Input id="inst-primary" value={form.primaryColor ?? ''} onChange={text('primaryColor')} placeholder="#6366f1" /></div>
          </Field>
          <Field id="inst-accent" label="Accent colour" error={error?.fields.accentColor?.[0]}>
            <div className="flex gap-2"><input type="color" aria-label="Pick accent colour" value={form.accentColor ?? '#8b5cf6'} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} className="h-9 w-12 rounded border border-input" /><Input id="inst-accent" value={form.accentColor ?? ''} onChange={text('accentColor')} placeholder="#8b5cf6" /></div>
          </Field>
          <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button></div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground">Logo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">PNG, JPG or WebP, up to 1 MB and 2000 × 2000 px.</p>
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
            {settings.data?.logoUrl ? <img src={settings.data.logoUrl} alt={`${settings.data.name} logo`} className="max-h-28 max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo yet</span>}
          </div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-card hover:bg-primary/5">
            <ImageUp size={15} aria-hidden="true" /> {upload.isPending ? 'Uploading…' : 'Upload logo'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file, { onSuccess: () => setNotice({ tone: 'success', text: 'Logo updated.' }), onError: (caught) => setNotice({ tone: 'error', text: toErrors(caught).message }) });
                event.target.value = '';
              }}
            />
          </label>
        </section>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Placement policy
// ---------------------------------------------------------------------------------------

/** One-offer, dream-offer, offer deadline, application cap and profile minimum (PRD v1.1 §6). */
export function PlacementPolicyModule() {
  const policy = usePlacementPolicy();
  const [form, setForm] = useState<PlacementPolicy | null>(null);
  const [error, setError] = useState<{ message: string; fields: Errors } | null>(null);
  const [saved, setSaved] = useState(false);
  const save = useSetupMutation((input: PlacementPolicy) => setupApi.updatePolicy(input), [setupKeys.policy, ['placement']]);

  useEffect(() => {
    if (policy.data) setForm(policy.data);
  }, [policy.data]);

  if (policy.isPending || !form) return <Skeleton className="h-64" />;
  const toggle = (key: 'oneOfferRule' | 'dreamOfferEnabled' | 'debarOnRenege') => setForm({ ...form, [key]: !form[key] });

  return (
    <div className="space-y-5">
      <PageHeader title="Placement policy" description="Rules applied to every student's applications in this institution." />
      {policy.data?.isDefault ? <Alert><AlertDescription>These are the default rules. Save to make them your institution's policy.</AlertDescription></Alert> : null}
      {saved ? <Alert variant="success"><AlertDescription>Policy saved. It applies to applications from now on.</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert> : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          setError(null);
          save.mutate(form, { onSuccess: () => setSaved(true), onError: (caught) => setError(toErrors(caught)) });
        }}
      >
        <PolicyRow title="One-offer rule" description="When a student accepts an offer, their other open applications are withdrawn and they cannot apply to more jobs.">
          <input type="checkbox" aria-label="One-offer rule" checked={form.oneOfferRule} onChange={() => toggle('oneOfferRule')} className="h-5 w-5 accent-primary" />
        </PolicyRow>
        <PolicyRow title="Dream offers" description="A placed student may still apply to one more job whose CTC is at least the amount below.">
          <div className="flex items-center gap-2">
            <input type="checkbox" aria-label="Allow dream offers" checked={form.dreamOfferEnabled} onChange={() => toggle('dreamOfferEnabled')} disabled={!form.oneOfferRule} className="h-5 w-5 accent-primary" />
            <Input aria-label="Dream offer minimum CTC in LPA" type="number" min="0" step="0.5" className="w-28" disabled={!form.dreamOfferEnabled} value={form.dreamOfferMinCtc ?? ''} onChange={(event) => setForm({ ...form, dreamOfferMinCtc: event.target.value ? Number(event.target.value) : null })} placeholder="LPA" />
          </div>
          {error?.fields.dreamOfferMinCtc ? <p className="text-xs text-destructive">{error.fields.dreamOfferMinCtc[0]}</p> : null}
        </PolicyRow>
        <PolicyRow title="Days to answer an offer" description="Offers not accepted or declined by then expire automatically.">
          <Input aria-label="Days to answer an offer" type="number" min="1" max="60" className="w-24" value={form.offerResponseDays} onChange={(event) => setForm({ ...form, offerResponseDays: Number(event.target.value) })} />
        </PolicyRow>
        <PolicyRow title="Active applications per student" description="Leave empty for no limit. Withdrawn, rejected and finished applications do not count.">
          <Input aria-label="Maximum active applications" type="number" min="1" max="100" className="w-24" value={form.maxActiveApplications ?? ''} onChange={(event) => setForm({ ...form, maxActiveApplications: event.target.value ? Number(event.target.value) : null })} placeholder="No limit" />
        </PolicyRow>
        <PolicyRow title="Minimum profile completion" description="Students must complete this much of their career profile before applying.">
          <div className="flex items-center gap-2"><Input aria-label="Minimum profile completion percent" type="number" min="0" max="100" className="w-24" value={form.minProfileCompletion} onChange={(event) => setForm({ ...form, minProfileCompletion: Number(event.target.value) })} /><span className="text-sm text-muted-foreground">%</span></div>
        </PolicyRow>
        <PolicyRow title="Debar on reneging" description="Recorded for your policy. Reneging (accepting and then backing out) is not tracked by the app yet, so it is not enforced automatically; debar students from the job's eligible list.">
          <input type="checkbox" aria-label="Debar on reneging" checked={form.debarOnRenege} onChange={() => toggle('debarOnRenege')} className="h-5 w-5 accent-primary" />
        </PolicyRow>
        <div className="flex justify-end"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save policy'}</Button></div>
      </form>
    </div>
  );
}

function PolicyRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">{children}</div>
    </section>
  );
}
