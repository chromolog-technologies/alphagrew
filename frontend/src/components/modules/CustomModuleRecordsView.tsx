/**
 * Records of one institution-created module (/app/module_{id}): list with search, status filter
 * and paging, plus create / edit / delete for users the module lets edit.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  emptyValue,
  toPayload,
  useCustomFieldDefinitions,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type CustomFieldValues,
} from '../../api/customFieldsApi';
import {
  useCustomModuleRecords,
  useDeleteCustomModuleRecord,
  useSaveCustomModuleRecord,
  type CustomModule,
  type CustomModuleRecord,
  type CustomModuleRecordStatus,
} from '../../api/customModulesApi';
import { ApiError } from '../../api/http';
import { CustomFieldInputs } from '../shared/CustomFieldInputs';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui';

const PER_PAGE = 25;
/** Custom fields shown as table columns; the rest are in the edit dialog. */
const MAX_FIELD_COLUMNS = 4;

type Draft = { id: number | null; title: string; status: CustomModuleRecordStatus; customFields: CustomFieldValues };

function formatValue(definition: CustomFieldDefinition, value: CustomFieldValue | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (definition.type === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function CustomModuleRecordsView({ module }: { module: CustomModule }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<CustomModuleRecordStatus | ''>('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<CustomModuleRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Another module, or new filters, start from the first page.
  useEffect(() => setPage(1), [module.id, debouncedSearch, status]);

  const definitions = useCustomFieldDefinitions(module.entity);
  const fields = useMemo(() => definitions.data ?? [], [definitions.data]);
  const columns = fields.slice(0, MAX_FIELD_COLUMNS);
  const records = useCustomModuleRecords(module.id, {
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    perPage: PER_PAGE,
  });
  const save = useSaveCustomModuleRecord(module.id);
  const remove = useDeleteCustomModuleRecord(module.id);

  const errors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError =
    save.error instanceof ApiError
      ? Object.keys(errors).length === 0
        ? save.error.message
        : null
      : save.error
        ? 'The record could not be saved.'
        : null;

  const openCreate = () => {
    save.reset();
    setDraft({
      id: null,
      title: '',
      status: 'active',
      customFields: Object.fromEntries(fields.map((f) => [f.key, emptyValue(f.type)])),
    });
  };

  const openEdit = (record: CustomModuleRecord) => {
    save.reset();
    setDraft({
      id: record.id,
      title: record.title,
      status: record.status,
      customFields: Object.fromEntries(fields.map((f) => [f.key, record.customFields[f.key] ?? emptyValue(f.type)])),
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    save.mutate(
      {
        id: draft.id,
        input: { title: draft.title.trim(), status: draft.status, customFields: toPayload(fields, draft.customFields) },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  const meta = records.data?.meta;
  const rows = records.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{module.pluralLabel}</h1>
            <p className="text-sm text-muted-foreground">
              {module.description ?? `${module.category} · ${meta?.total ?? module.recordsCount ?? 0} records`}
            </p>
          </div>
        </div>
        {module.canEdit ? (
          <Button type="button" onClick={openCreate} disabled={definitions.isLoading} className="gap-1.5">
            <Plus size={16} /> New {module.singularLabel}
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label={`Search ${module.pluralLabel}`}
              placeholder={`Search ${module.pluralLabel.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomModuleRecordStatus | '')}
            className="sm:w-44"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </div>

        {records.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : records.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {records.error instanceof ApiError ? records.error.message : `${module.pluralLabel} could not be loaded.`}
            </AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {debouncedSearch || status ? 'No records match these filters.' : `No ${module.pluralLabel.toLowerCase()} yet.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{module.singularLabel}</TableHead>
                  {columns.map((f) => (
                    <TableHead key={f.id}>{f.label}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  {module.canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.title}</TableCell>
                    {columns.map((f) => (
                      <TableCell key={f.id}>{formatValue(f, record.customFields[f.key])}</TableCell>
                    ))}
                    <TableCell>
                      <Badge variant={record.status === 'active' ? 'success' : 'secondary'}>
                        {record.status === 'active' ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(record.updatedAt)}</TableCell>
                    {module.canEdit ? (
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${record.title}`} onClick={() => openEdit(record)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${record.title}`}
                          onClick={() => {
                            remove.reset();
                            setDeleting(record);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {meta && meta.lastPage > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {meta.currentPage} of {meta.lastPage} · {meta.total} records
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= meta.lastPage} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Create / edit */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          {draft ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? `New ${module.singularLabel}` : `Edit “${draft.title}”`}</DialogTitle>
                <DialogDescription>{module.pluralLabel}</DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="record-title">
                    {module.singularLabel} name / title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="record-title"
                    required
                    maxLength={255}
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                  {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-status">Status</Label>
                  <Select
                    id="record-status"
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as CustomModuleRecordStatus })}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </Select>
                </div>
                <CustomFieldInputs
                  definitions={fields}
                  values={draft.customFields}
                  onChange={(customFields) => setDraft({ ...draft, customFields })}
                  errors={errors}
                />
              </div>

              {formError ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending || !draft.title.trim()}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.title}”?</DialogTitle>
            <DialogDescription>The record will be removed from {module.pluralLabel} for everyone.</DialogDescription>
          </DialogHeader>
          {remove.error ? (
            <Alert variant="destructive">
              <AlertDescription>{remove.error instanceof ApiError ? remove.error.message : 'The record could not be deleted.'}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
