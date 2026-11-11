import { useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import {
  EMPLOYMENT_TYPES,
  OPERATOR_LABELS,
  RULE_FIELDS,
  placementApi,
  type EligibilityRule,
  type EmploymentType,
  type Job,
  type JobInput,
  type RuleField,
} from '../../api/placementApi';
import { ApiError } from '../../api/http';
import { Alert, AlertDescription, Button, Input, Label, Select, Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../ui';

type EditableField = Exclude<RuleField, 'skill'>;
type RuleDraft = { field: EditableField; operator: EligibilityRule['operator']; text: string };

interface JobEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  companies: { id: number; name: string }[];
  onSave: (input: JobInput) => Promise<unknown>;
}

const toDraft = (rule: EligibilityRule): RuleDraft | null => {
  if (rule.field === 'skill') return null; // skill rules are kept as they are
  return { field: rule.field, operator: rule.operator, text: Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value) };
};

/** Draft rules → API rules; a list field takes comma-separated values. */
export function draftsToRules(drafts: RuleDraft[]): EligibilityRule[] {
  return drafts
    .filter((draft) => draft.text.trim() !== '')
    .map((draft) => ({
      field: draft.field,
      operator: draft.operator,
      value: RULE_FIELDS[draft.field].kind === 'list'
        ? draft.text.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
        : Number(draft.text),
    }));
}

const localDateTime = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/** Create or edit a job: company, details and eligibility rules with a live eligible-student count. */
export function JobEditorSheet({ open, onOpenChange, job, companies, onSave }: JobEditorSheetProps) {
  const [form, setForm] = useState({
    companyName: '', industry: '', website: '', title: '', description: '', employmentType: 'full_time' as EmploymentType,
    location: '', ctcMinLpa: '', ctcMaxLpa: '', stipendMonthly: '', openings: '', requiredSkills: '', applyDeadline: '', driveDate: '',
  });
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [keptRules, setKeptRules] = useState<EligibilityRule[]>([]);
  const [preview, setPreview] = useState<{ total: number; eligible: number; excludedByRule: number[] } | null>(null);
  const [error, setError] = useState<{ message: string; fields: Record<string, string[]> } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      companyName: job?.company?.name ?? '', industry: job?.company?.industry ?? '', website: job?.company?.website ?? '',
      title: job?.title ?? '', description: job?.description ?? '', employmentType: job?.employmentType ?? 'full_time',
      location: job?.location ?? '', ctcMinLpa: job?.ctcMinLpa?.toString() ?? '', ctcMaxLpa: job?.ctcMaxLpa?.toString() ?? '',
      stipendMonthly: job?.stipendMonthly?.toString() ?? '', openings: job?.openings?.toString() ?? '',
      requiredSkills: (job?.requiredSkills ?? []).join(', '), applyDeadline: localDateTime(job?.applyDeadline ?? null), driveDate: job?.driveDate ?? '',
    });
    const existing = job?.eligibility ?? [];
    setRules(existing.map(toDraft).filter((draft): draft is RuleDraft => draft !== null));
    setKeptRules(existing.filter((rule) => rule.field === 'skill'));
  }, [open, job]);

  // Live preview of the rules, debounced.
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      placementApi.preview([...draftsToRules(rules), ...keptRules]).then(setPreview).catch(() => setPreview(null));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [open, rules, keptRules]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  const fieldError = (key: string) => error?.fields[key]?.[0];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const known = companies.find((company) => company.name.toLowerCase() === form.companyName.trim().toLowerCase());
    try {
      await onSave({
        ...(known ? { companyId: known.id } : { companyName: form.companyName.trim() }),
        industry: form.industry || null,
        website: form.website || null,
        title: form.title,
        description: form.description || null,
        employmentType: form.employmentType,
        location: form.location || null,
        ctcMinLpa: number(form.ctcMinLpa),
        ctcMaxLpa: number(form.ctcMaxLpa),
        stipendMonthly: number(form.stipendMonthly),
        openings: number(form.openings),
        requiredSkills: form.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean),
        applyDeadline: form.applyDeadline ? new Date(form.applyDeadline).toISOString() : null,
        driveDate: form.driveDate || null,
        eligibility: [...draftsToRules(rules), ...keptRules],
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError
        ? { message: caught.message, fields: caught.fieldErrors }
        : { message: 'The job could not be saved.', fields: {} });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{job ? 'Edit job' : 'New job'}</SheetTitle>
            <SheetDescription>Jobs start as drafts. Students see a job, and eligible students are notified, when you publish it.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-4">
            {error ? <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert> : null}

            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="Company" id="job-company" error={fieldError('companyName') ?? fieldError('companyId')}>
                <Input id="job-company" list="job-company-options" value={form.companyName} onChange={set('companyName')} required />
                <datalist id="job-company-options">{companies.map((company) => <option key={company.id} value={company.name} />)}</datalist>
              </Field>
              <Field label="Industry" id="job-industry"><Input id="job-industry" value={form.industry} onChange={set('industry')} /></Field>
              <Field label="Job title" id="job-title" error={fieldError('title')}><Input id="job-title" value={form.title} onChange={set('title')} required /></Field>
              <Field label="Type" id="job-type">
                <Select id="job-type" value={form.employmentType} onChange={set('employmentType')}>
                  {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
              <Field label="CTC from (LPA)" id="job-ctc-min" error={fieldError('ctcMinLpa')}><Input id="job-ctc-min" type="number" step="0.1" min="0" value={form.ctcMinLpa} onChange={set('ctcMinLpa')} /></Field>
              <Field label="CTC up to (LPA)" id="job-ctc-max" error={fieldError('ctcMaxLpa')}><Input id="job-ctc-max" type="number" step="0.1" min="0" value={form.ctcMaxLpa} onChange={set('ctcMaxLpa')} /></Field>
              {form.employmentType !== 'full_time' ? (
                <Field label="Stipend per month" id="job-stipend"><Input id="job-stipend" type="number" min="0" value={form.stipendMonthly} onChange={set('stipendMonthly')} /></Field>
              ) : null}
              <Field label="Location" id="job-location"><Input id="job-location" value={form.location} onChange={set('location')} /></Field>
              <Field label="Openings" id="job-openings"><Input id="job-openings" type="number" min="1" value={form.openings} onChange={set('openings')} /></Field>
              <Field label="Apply by" id="job-deadline" error={fieldError('applyDeadline')}><Input id="job-deadline" type="datetime-local" value={form.applyDeadline} onChange={set('applyDeadline')} /></Field>
              <Field label="Drive date" id="job-drive-date"><Input id="job-drive-date" type="date" value={form.driveDate} onChange={set('driveDate')} /></Field>
              <Field label="Required skills (comma separated)" id="job-skills" wide><Input id="job-skills" value={form.requiredSkills} onChange={set('requiredSkills')} placeholder="Java, SQL, React" /></Field>
              <Field label="Description" id="job-description" wide>
                <textarea id="job-description" value={form.description} onChange={set('description')} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </Field>
            </section>

            <section className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Eligibility rules</h3>
                  <p className="text-xs text-muted-foreground">Students must meet every rule. They see which rule they do not meet.</p>
                </div>
                {preview ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary" aria-live="polite">
                    <Users size={13} aria-hidden="true" /> {preview.eligible} of {preview.total} students eligible
                  </span>
                ) : null}
              </div>

              {rules.map((rule, index) => {
                const meta = RULE_FIELDS[rule.field];
                return (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1.2fr_0.9fr_1.2fr_auto] sm:items-start">
                    <Select
                      aria-label={`Rule ${index + 1} field`}
                      value={rule.field}
                      onChange={(event) => {
                        const field = event.target.value as EditableField;
                        setRules((items) => items.map((item, i) => (i === index ? { field, operator: RULE_FIELDS[field].operators[0], text: '' } : item)));
                      }}
                    >
                      {Object.entries(RULE_FIELDS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                    </Select>
                    <Select
                      aria-label={`Rule ${index + 1} condition`}
                      value={rule.operator}
                      onChange={(event) => setRules((items) => items.map((item, i) => (i === index ? { ...item, operator: event.target.value as RuleDraft['operator'] } : item)))}
                    >
                      {meta.operators.map((operator) => <option key={operator} value={operator}>{OPERATOR_LABELS[operator]}</option>)}
                    </Select>
                    <div>
                      <Input
                        aria-label={`Rule ${index + 1} value`}
                        type={meta.kind === 'number' ? 'number' : 'text'}
                        step="0.1"
                        min="0"
                        value={rule.text}
                        placeholder={meta.kind === 'list' ? 'CSE, ECE' : '7.0'}
                        onChange={(event) => setRules((items) => items.map((item, i) => (i === index ? { ...item, text: event.target.value } : item)))}
                      />
                      {fieldError(`eligibility.${index}.value`) ? <p className="mt-1 text-xs text-destructive">{fieldError(`eligibility.${index}.value`)}</p> : null}
                      {preview?.excludedByRule[index] ? <p className="mt-1 text-xs text-muted-foreground">Excludes {preview.excludedByRule[index]} students</p> : null}
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove rule ${index + 1}`} onClick={() => setRules((items) => items.filter((_, i) => i !== index))}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                );
              })}
              {keptRules.length ? <p className="text-xs text-muted-foreground">{keptRules.length} skill rule(s) kept unchanged.</p> : null}

              <Button type="button" variant="outline" size="sm" onClick={() => setRules((items) => [...items, { field: 'cgpa', operator: 'gte', text: '' }])}>
                <Plus size={14} /> Add rule
              </Button>
            </section>
          </div>

          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : job ? 'Save changes' : 'Create draft'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, id, error, wide, children }: { label: string; id: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
