import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Gauge, LineChart, ListOrdered, PieChart, Plus, Table2, Trash2 } from 'lucide-react';
import {
  dashboardsApi,
  type Aggregation,
  type DataSource,
  type FilterOperator,
  type HavingOperator,
  type SourceField,
  type ValueFormat,
  type Widget,
  type WidgetFilter,
  type WidgetSpec,
  type WidgetType,
} from '../../api/dashboardsApi';
import { ApiError } from '../../api/http';
import { Badge, Button, Input, Label, Select, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui';
import { AGGREGATION_LABELS, defaultSize, sanitizeSpec } from './dashboardUtils';
import { WidgetView } from './WidgetView';

const WIDGET_TYPES: { value: WidgetType; label: string; icon: typeof BarChart3 }[] = [
  { value: 'kpi', label: 'Number', icon: Gauge },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChart },
  { value: 'pie', label: 'Pie', icon: PieChart },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'list', label: 'List', icon: ListOrdered },
];

/** Operators per field type; mirrors App\Services\Dashboards\WidgetQuery::OPERATORS. */
export const OPERATORS: Record<SourceField['type'], FilterOperator[]> = {
  string: ['=', '!=', 'in', 'not_in', 'contains', 'is_null', 'not_null'],
  number: ['=', '!=', '>', '>=', '<', '<=', 'between', 'in', 'is_null', 'not_null'],
  date: ['=', '>', '>=', '<', '<=', 'between', 'last_days', 'next_days', 'is_null', 'not_null'],
  boolean: ['=', 'is_null', 'not_null'],
};

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  '=': 'is',
  '!=': 'is not',
  '>': 'greater than',
  '>=': 'at least',
  '<': 'less than',
  '<=': 'at most',
  in: 'is any of',
  not_in: 'is none of',
  contains: 'contains',
  between: 'between',
  last_days: 'in the last … days',
  next_days: 'in the next … days',
  is_null: 'is empty',
  not_null: 'is not empty',
};

const HAVING_OPERATORS: HavingOperator[] = ['<', '<=', '=', '!=', '>=', '>'];

interface WidgetBuilderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: DataSource[];
  widget: Widget | null;
  onSave: (widget: Widget) => void;
}

/** Zoho-style widget editor with a live preview. Works on a copy until "Save widget". */
export function WidgetBuilderSheet({ open, onOpenChange, sources, widget, onSave }: WidgetBuilderSheetProps) {
  const [draft, setDraft] = useState<Widget | null>(widget);

  useEffect(() => {
    if (open) setDraft(widget);
  }, [open, widget]);

  const source = sources.find((item) => item.key === draft?.spec.source) ?? sources[0];
  const fields = source?.fields ?? [];
  const measureFields = fields.filter((field) => field.aggregations.length > 0);
  const dimensionFields = fields.filter((field) => field.dimension);
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);

  if (!draft || !source) return null;

  const spec = draft.spec;
  const maxDimensions = draft.type === 'kpi' ? 0 : draft.type === 'pie' ? 1 : 2;
  const multipleMeasures = draft.type !== 'kpi' && draft.type !== 'pie';

  const setSpec = (next: Partial<WidgetSpec>) => setDraft((current) => (current ? { ...current, spec: { ...current.spec, ...next } } : current));
  const setOptions = (next: Partial<NonNullable<Widget['options']>>) =>
    setDraft((current) => (current ? { ...current, options: { ...current.options, ...next } } : current));

  const changeType = (type: WidgetType) =>
    setDraft((current) => {
      if (!current) return current;
      const size = current.type === type ? current.layout : { ...current.layout, ...defaultSize(type) };
      return { ...current, type, layout: size, spec: sanitizeSpec(current.spec, type, fields) };
    });

  const changeSource = (key: string) => {
    const next = sources.find((item) => item.key === key);
    if (!next) return;
    setDraft((current) => (current ? { ...current, spec: sanitizeSpec({ ...current.spec, source: key, filters: [], having: [] }, current.type, next.fields) } : current));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{widget?.title === 'New widget' ? 'Add widget' : 'Edit widget'}</SheetTitle>
          <SheetDescription>Pick the data, how to summarise it and how to show it. The preview uses your own data access.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <Section title="Title">
              <Input value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="Widget title" />
            </Section>

            <Section title="Chart type">
              <div className="grid grid-cols-3 gap-2">
                {WIDGET_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeType(value)}
                    aria-pressed={draft.type === value}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      draft.type === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Data" hint={source.description}>
              <Select value={source.key} onChange={(event) => changeSource(event.target.value)} aria-label="Data source">
                {sources.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </Select>
            </Section>

            <Section title={multipleMeasures ? 'Values' : 'Value'}>
              <div className="space-y-2">
                {spec.measures.map((measure, index) => {
                  const field = fieldByKey.get(measure.field);
                  return (
                    <div key={index} className="grid grid-cols-[1fr_9rem_auto] gap-2">
                      <FieldSelect
                        label={`Value ${index + 1} field`}
                        fields={measureFields}
                        value={measure.field}
                        onChange={(key) => {
                          const next = fieldByKey.get(key);
                          const agg = next?.aggregations.includes(measure.agg) ? measure.agg : (next?.aggregations[0] ?? 'count');
                          setSpec({ measures: spec.measures.map((m, i) => (i === index ? { field: key, agg } : m)) });
                        }}
                      />
                      <Select
                        aria-label={`Value ${index + 1} calculation`}
                        value={measure.agg}
                        onChange={(event) => setSpec({ measures: spec.measures.map((m, i) => (i === index ? { ...m, agg: event.target.value as Aggregation } : m)) })}
                      >
                        {(field?.aggregations ?? []).map((agg) => <option key={agg} value={agg}>{AGGREGATION_LABELS[agg]}</option>)}
                      </Select>
                      <RemoveButton
                        label={`Remove value ${index + 1}`}
                        disabled={spec.measures.length === 1}
                        onClick={() => setSpec({
                          measures: spec.measures.filter((_, i) => i !== index),
                          having: (spec.having ?? []).filter((h) => h.measure !== index).map((h) => (h.measure > index ? { ...h, measure: h.measure - 1 } : h)),
                          sort: null,
                        })}
                      />
                    </div>
                  );
                })}
                {multipleMeasures && spec.measures.length < 6 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSpec({ measures: [...spec.measures, { field: 'records', agg: 'count' }] })}>
                    <Plus size={14} /> Add value
                  </Button>
                ) : null}
              </div>
            </Section>

            {maxDimensions > 0 ? (
              <Section title="Group by" hint={maxDimensions === 2 ? 'A second grouping splits each bar or line into series.' : undefined}>
                <div className="space-y-2">
                  {(spec.dimensions ?? []).map((dimension, index) => {
                    const field = fieldByKey.get(dimension.field);
                    return (
                      <div key={index} className="grid grid-cols-[1fr_8rem_auto] gap-2">
                        <FieldSelect
                          label={`Group ${index + 1}`}
                          fields={dimensionFields}
                          value={dimension.field}
                          onChange={(key) => setSpec({
                            dimensions: (spec.dimensions ?? []).map((d, i) => (i === index ? { field: key, ...(fieldByKey.get(key)?.type === 'date' ? { grain: 'month' as const } : {}) } : d)),
                          })}
                        />
                        {field?.type === 'date' ? (
                          <Select
                            aria-label={`Group ${index + 1} period`}
                            value={dimension.grain ?? 'day'}
                            onChange={(event) => setSpec({
                              dimensions: (spec.dimensions ?? []).map((d, i) => (i === index ? { ...d, grain: event.target.value as 'day' | 'month' | 'year' } : d)),
                            })}
                          >
                            <option value="day">By day</option>
                            <option value="month">By month</option>
                            <option value="year">By year</option>
                          </Select>
                        ) : <span />}
                        <RemoveButton
                          label={`Remove group ${index + 1}`}
                          onClick={() => setSpec({ dimensions: (spec.dimensions ?? []).filter((_, i) => i !== index), sort: null })}
                        />
                      </div>
                    );
                  })}
                  {(spec.dimensions ?? []).length < maxDimensions && dimensionFields.length ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSpec({ dimensions: [...(spec.dimensions ?? []), { field: dimensionFields[0].key }] })}
                    >
                      <Plus size={14} /> Add grouping
                    </Button>
                  ) : null}
                </div>
              </Section>
            ) : null}

            <Section title="Filters" hint="Only rows matching every filter are counted.">
              <div className="space-y-2">
                {(spec.filters ?? []).map((filter, index) => (
                  <FilterRow
                    key={index}
                    index={index}
                    filter={filter}
                    fields={dimensionFields}
                    onChange={(next) => setSpec({ filters: (spec.filters ?? []).map((f, i) => (i === index ? next : f)) })}
                    onRemove={() => setSpec({ filters: (spec.filters ?? []).filter((_, i) => i !== index) })}
                  />
                ))}
                {(spec.filters ?? []).length < 10 && dimensionFields.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSpec({ filters: [...(spec.filters ?? []), defaultFilter(dimensionFields[0])] })}
                  >
                    <Plus size={14} /> Add filter
                  </Button>
                ) : null}
              </div>
            </Section>

            {(spec.dimensions ?? []).length > 0 ? (
              <Section title="Only show groups where" hint="For example: attendance below 75%.">
                <div className="space-y-2">
                  {(spec.having ?? []).map((having, index) => (
                    <div key={index} className="grid grid-cols-[1fr_7rem_7rem_auto] gap-2">
                      <Select
                        aria-label={`Condition ${index + 1} value`}
                        value={having.measure}
                        onChange={(event) => setSpec({ having: (spec.having ?? []).map((h, i) => (i === index ? { ...h, measure: Number(event.target.value) } : h)) })}
                      >
                        {spec.measures.map((measure, i) => (
                          <option key={i} value={i}>{measure.label || `${AGGREGATION_LABELS[measure.agg]} ${fieldByKey.get(measure.field)?.label ?? measure.field}`}</option>
                        ))}
                      </Select>
                      <Select
                        aria-label={`Condition ${index + 1} operator`}
                        value={having.op}
                        onChange={(event) => setSpec({ having: (spec.having ?? []).map((h, i) => (i === index ? { ...h, op: event.target.value as HavingOperator } : h)) })}
                      >
                        {HAVING_OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                      </Select>
                      <Input
                        type="number"
                        aria-label={`Condition ${index + 1} amount`}
                        value={having.value}
                        onChange={(event) => setSpec({ having: (spec.having ?? []).map((h, i) => (i === index ? { ...h, value: Number(event.target.value) } : h)) })}
                      />
                      <RemoveButton label={`Remove condition ${index + 1}`} onClick={() => setSpec({ having: (spec.having ?? []).filter((_, i) => i !== index) })} />
                    </div>
                  ))}
                  {(spec.having ?? []).length < 5 ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSpec({ having: [...(spec.having ?? []), { measure: 0, op: '<', value: 75 }] })}>
                      <Plus size={14} /> Add condition
                    </Button>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {draft.type !== 'kpi' ? (
              <Section title="Sort and limit">
                <div className="grid grid-cols-[1fr_8rem_6rem] gap-2">
                  <Select
                    aria-label="Sort by"
                    value={spec.sort?.by ?? ''}
                    onChange={(event) => setSpec({ sort: event.target.value ? { by: event.target.value, dir: spec.sort?.dir ?? 'desc' } : null })}
                  >
                    <option value="">Default order</option>
                    {(spec.dimensions ?? []).map((dimension, i) => (
                      <option key={`d${i}`} value={`d${i}`}>{fieldByKey.get(dimension.field)?.label ?? dimension.field}</option>
                    ))}
                    {spec.measures.map((measure, i) => (
                      <option key={`m${i}`} value={`m${i}`}>{measure.label || `${AGGREGATION_LABELS[measure.agg]} ${fieldByKey.get(measure.field)?.label ?? measure.field}`}</option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Sort direction"
                    value={spec.sort?.dir ?? 'desc'}
                    disabled={!spec.sort}
                    onChange={(event) => spec.sort && setSpec({ sort: { ...spec.sort, dir: event.target.value as 'asc' | 'desc' } })}
                  >
                    <option value="desc">Highest first</option>
                    <option value="asc">Lowest first</option>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    aria-label="Maximum rows"
                    value={spec.limit ?? 100}
                    onChange={(event) => setSpec({ limit: Math.max(1, Math.min(500, Number(event.target.value) || 1)) })}
                  />
                </div>
              </Section>
            ) : null}

            <Section title="Display">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  aria-label="Number format"
                  value={draft.options?.format ?? 'number'}
                  onChange={(event) => setOptions({ format: event.target.value as ValueFormat })}
                >
                  <option value="number">Whole numbers</option>
                  <option value="decimal">Two decimals</option>
                  <option value="percent">Percentage</option>
                </Select>
                <Input
                  type="number"
                  placeholder="Target (optional)"
                  aria-label="Target"
                  value={draft.options?.target ?? ''}
                  onChange={(event) => setOptions({ target: event.target.value === '' ? undefined : Number(event.target.value) })}
                />
              </div>
              {draft.type === 'bar' && (spec.dimensions ?? []).length === 2 ? (
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={Boolean(draft.options?.stacked)} onChange={(event) => setOptions({ stacked: event.target.checked })} />
                  Stack the series
                </label>
              ) : null}
            </Section>
          </div>

          <div className="lg:sticky lg:top-0 lg:self-start">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Preview</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="mb-3 truncate text-sm font-bold text-slate-900">{draft.title || 'Untitled widget'}</p>
              <WidgetPreview widget={draft} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-100 bg-white pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!draft.title.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim() })}>Save widget</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Runs the draft spec shortly after the user stops changing it. */
function WidgetPreview({ widget }: { widget: Widget }) {
  const [spec, setSpec] = useState(widget.spec);

  useEffect(() => {
    const timer = window.setTimeout(() => setSpec(widget.spec), 400);
    return () => window.clearTimeout(timer);
  }, [widget.spec]);

  const preview = useQuery({
    queryKey: ['dashboards', 'preview', spec],
    queryFn: () => dashboardsApi.query(spec),
    retry: false,
  });

  const result = preview.data
    ? ({ ok: true, ...preview.data } as const)
    : preview.error
      ? { ok: false as const, status: preview.error instanceof ApiError ? preview.error.status : 0, message: previewError(preview.error) }
      : undefined;

  return (
    <div className={widget.type === 'kpi' ? '' : 'h-72'}>
      <WidgetView widget={widget} result={result} loading={preview.isFetching && !preview.data} />
    </div>
  );
}

function previewError(error: unknown): string {
  if (error instanceof ApiError) {
    return Object.values(error.firstFieldErrors)[0] ?? error.message;
  }
  return 'The preview could not be loaded.';
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</Label>
      {hint ? <p className="mb-2 mt-0.5 text-xs text-slate-400">{hint}</p> : <div className="mb-2" />}
      {children}
    </section>
  );
}

function RemoveButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <Trash2 size={15} />
    </Button>
  );
}

/** Field picker grouped into built-in fields and custom fields. */
function FieldSelect({ label, fields, value, onChange }: { label: string; fields: SourceField[]; value: string; onChange: (key: string) => void }) {
  const builtIn = fields.filter((field) => !field.custom);
  const custom = fields.filter((field) => field.custom);

  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {builtIn.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
      {custom.length ? (
        <optgroup label="Custom fields">
          {custom.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
        </optgroup>
      ) : null}
    </Select>
  );
}

function defaultFilter(field: SourceField): WidgetFilter {
  return { field: field.key, op: field.type === 'date' ? 'last_days' : '=', value: field.type === 'date' ? 30 : field.type === 'boolean' ? true : (field.options[0] ?? '') };
}

function FilterRow({ index, filter, fields, onChange, onRemove }: {
  index: number;
  filter: WidgetFilter;
  fields: SourceField[];
  onChange: (filter: WidgetFilter) => void;
  onRemove: () => void;
}) {
  const field = fields.find((item) => item.key === filter.field) ?? fields[0];
  const operators = OPERATORS[field.type];

  const changeOperator = (op: FilterOperator) => {
    const value = ['in', 'not_in'].includes(op) ? (field.options.length ? [field.options[0]] : [])
      : op === 'between' ? ['', '']
      : ['last_days', 'next_days'].includes(op) ? 30
      : ['is_null', 'not_null'].includes(op) ? undefined
      : Array.isArray(filter.value) ? '' : filter.value;
    onChange({ ...filter, op, value });
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2">
      <div className="grid grid-cols-[1fr_10rem_auto] gap-2">
        <FieldSelect
          label={`Filter ${index + 1} field`}
          fields={fields}
          value={field.key}
          onChange={(key) => onChange(defaultFilter(fields.find((item) => item.key === key) ?? field))}
        />
        <Select aria-label={`Filter ${index + 1} operator`} value={filter.op} onChange={(event) => changeOperator(event.target.value as FilterOperator)}>
          {operators.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
        </Select>
        <RemoveButton label={`Remove filter ${index + 1}`} onClick={onRemove} />
      </div>
      <FilterValue index={index} field={field} filter={filter} onChange={(value) => onChange({ ...filter, value })} />
      {field.custom ? <Badge className="mt-2" variant="secondary">Custom field</Badge> : null}
    </div>
  );
}

function FilterValue({ index, field, filter, onChange }: { index: number; field: SourceField; filter: WidgetFilter; onChange: (value: unknown) => void }) {
  const label = `Filter ${index + 1} value`;
  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';

  if (filter.op === 'is_null' || filter.op === 'not_null') return null;

  if (filter.op === 'last_days' || filter.op === 'next_days') {
    return <Input className="mt-2" type="number" min={1} max={3660} aria-label={label} value={Number(filter.value ?? 30)} onChange={(event) => onChange(Number(event.target.value))} />;
  }

  if (filter.op === 'between') {
    const [from, to] = Array.isArray(filter.value) ? filter.value : ['', ''];
    return (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input type={inputType} aria-label={`${label} from`} value={String(from ?? '')} onChange={(event) => onChange([event.target.value, to])} />
        <Input type={inputType} aria-label={`${label} to`} value={String(to ?? '')} onChange={(event) => onChange([from, event.target.value])} />
      </div>
    );
  }

  if (filter.op === 'in' || filter.op === 'not_in') {
    const selected = Array.isArray(filter.value) ? filter.value.map(String) : [];
    if (field.options.length) {
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {field.options.map((option) => {
            const on = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((item) => item !== option) : [...selected, option])}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {option.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <Input
        className="mt-2"
        aria-label={label}
        placeholder="Values separated by commas"
        value={selected.join(', ')}
        onChange={(event) => onChange(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="mt-2">
        <Select aria-label={label} value={filter.value ? 'true' : 'false'} onChange={(event) => onChange(event.target.value === 'true')}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </div>
    );
  }

  if (field.options.length && filter.op !== 'contains') {
    return (
      <div className="mt-2">
        <Select aria-label={label} value={String(filter.value ?? '')} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
        </Select>
      </div>
    );
  }

  return (
    <Input
      className="mt-2"
      type={inputType}
      aria-label={label}
      value={String(filter.value ?? '')}
      onChange={(event) => onChange(field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)}
    />
  );
}
