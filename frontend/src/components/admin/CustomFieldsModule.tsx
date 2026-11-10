import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldEntity,
  type CustomFieldInput,
  type CustomFieldType,
  useCustomFieldDefinitions,
  useDeleteCustomField,
  useSaveCustomField,
} from '../../api/customFieldsApi';
import { ApiError } from '../../api/http';
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '../ui';

type Draft = {
  id: number | null;
  entity: CustomFieldEntity;
  label: string;
  key: string;
  type: CustomFieldType;
  options: string;
  helpText: string;
  isRequired: boolean;
  isActive: boolean;
};

const emptyDraft = (entity: CustomFieldEntity): Draft => ({
  id: null, entity, label: '', key: '', type: 'text', options: '', helpText: '', isRequired: false, isActive: true,
});

const hasOptions = (type: CustomFieldType) => type === 'select' || type === 'multiselect';

/**
 * Institution admins add their own fields to students, staff, subjects and exams. The fields
 * appear on those forms and in the dashboard builder, so dashboards can group and filter by them.
 */
export function CustomFieldsModule() {
  const [entity, setEntity] = useState<CustomFieldEntity>('student');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<CustomFieldDefinition | null>(null);
  const definitions = useCustomFieldDefinitions(entity, { includeInactive: true });
  const save = useSaveCustomField();
  const remove = useDeleteCustomField();

  const errors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save.error instanceof ApiError && Object.keys(errors).length === 0 ? save.error.message : null;

  const openEdit = (field: CustomFieldDefinition) => {
    save.reset();
    setDraft({
      id: field.id, entity: field.entity, label: field.label, key: field.key, type: field.type,
      options: field.options.join('\n'), helpText: field.helpText ?? '', isRequired: field.isRequired, isActive: field.isActive,
    });
  };

  const submit = () => {
    if (!draft) return;
    const input: CustomFieldInput = {
      label: draft.label.trim(),
      type: draft.type,
      helpText: draft.helpText.trim() || null,
      isRequired: draft.isRequired,
      isActive: draft.isActive,
      ...(hasOptions(draft.type) ? { options: draft.options.split('\n').map((option) => option.trim()).filter(Boolean) } : {}),
      ...(draft.id === null ? { entity: draft.entity, key: draft.key.trim() || undefined } : {}),
    };
    save.mutate({ id: draft.id, input }, { onSuccess: () => setDraft(null) });
  };

  const move = (field: CustomFieldDefinition, direction: -1 | 1) => {
    const list = definitions.data ?? [];
    const index = list.findIndex((item) => item.id === field.id);
    const other = list[index + direction];
    if (!other) return;
    // Give every field a distinct position, then swap the two.
    list.forEach((item, position) => {
      const sortOrder = item.id === field.id ? index + direction : item.id === other.id ? index : position;
      if (item.sortOrder !== sortOrder) save.mutate({ id: item.id, input: { sortOrder } });
    });
  };

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Custom fields</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Add the details your institution tracks, such as hostel, blood group, scholarship or invigilator. They appear on the forms
              and can be used in dashboards to group, filter and count records.
            </p>
          </div>
          <Button type="button" onClick={() => { save.reset(); setDraft(emptyDraft(entity)); }}>
            <Plus size={16} /> Add field
          </Button>
        </div>

        <Tabs value={entity} onValueChange={(value) => setEntity(value as CustomFieldEntity)} className="mt-5">
          <TabsList>
            {CUSTOM_FIELD_ENTITIES.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>

        <div className="mt-5">
          {definitions.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : definitions.error ? (
            <Alert variant="destructive"><AlertDescription>Custom fields could not be loaded.</AlertDescription></Alert>
          ) : (definitions.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No custom fields for {CUSTOM_FIELD_ENTITIES.find((item) => item.value === entity)?.label.toLowerCase()} yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {(definitions.data ?? []).map((field, index, list) => (
                <li key={field.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{field.label}</p>
                      <Badge variant="secondary">{CUSTOM_FIELD_TYPES.find((type) => type.value === field.type)?.label}</Badge>
                      {field.isRequired ? <Badge variant="warning">Required</Badge> : null}
                      {!field.isActive ? <Badge variant="outline">Hidden</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Key <code className="rounded bg-slate-100 px-1">{field.key}</code>
                      {field.options.length ? ` · ${field.options.join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" disabled={index === 0 || save.isPending} onClick={() => move(field, -1)} aria-label={`Move ${field.label} up`}>↑</Button>
                    <Button type="button" variant="ghost" size="sm" disabled={index === list.length - 1 || save.isPending} onClick={() => move(field, 1)} aria-label={`Move ${field.label} down`}>↓</Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(field)} aria-label={`Edit ${field.label}`}><Pencil size={15} /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDeleting(field)} aria-label={`Delete ${field.label}`}><Trash2 size={15} /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? 'Add custom field' : `Edit “${draft.label}”`}</DialogTitle>
                <DialogDescription>
                  {draft.id === null
                    ? `For ${CUSTOM_FIELD_ENTITIES.find((item) => item.value === draft.entity)?.label.toLowerCase()}.`
                    : 'The record type and key cannot change once a field exists.'}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cf-label">Label</Label>
                  <Input id="cf-label" required maxLength={100} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} error={Boolean(errors.label)} />
                  {errors.label ? <p className="text-xs text-red-600">{errors.label}</p> : null}
                </div>

                {draft.id === null ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-key">Key (optional)</Label>
                    <Input id="cf-key" placeholder="Made from the label" maxLength={50} value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} error={Boolean(errors.key)} />
                    <p className="text-xs text-slate-500">Lowercase letters, numbers and underscores. Used by imports and the API.</p>
                    {errors.key ? <p className="text-xs text-red-600">{errors.key}</p> : null}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="cf-type">Type</Label>
                  <Select id="cf-type" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as CustomFieldType })}>
                    {CUSTOM_FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </Select>
                  {errors.type ? <p className="text-xs text-red-600">{errors.type}</p> : null}
                </div>

                {hasOptions(draft.type) ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-options">Choices (one per line)</Label>
                    <textarea
                      id="cf-options"
                      rows={4}
                      value={draft.options}
                      onChange={(event) => setDraft({ ...draft, options: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    {errors.options || errors['options.0'] ? <p className="text-xs text-red-600">{errors.options ?? errors['options.0']}</p> : null}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="cf-help">Help text (optional)</Label>
                  <Input id="cf-help" maxLength={255} value={draft.helpText} onChange={(event) => setDraft({ ...draft, helpText: event.target.value })} />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={draft.isRequired} onChange={(event) => setDraft({ ...draft, isRequired: event.target.checked })} />
                  Required on the form
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
                  Show on forms and dashboards
                </label>

                {formError ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={save.isPending || !draft.label.trim()}>{save.isPending ? 'Saving…' : 'Save field'}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.label}”?</DialogTitle>
            <DialogDescription>
              The field disappears from forms and dashboards, and widgets that use it will show an error until they are edited.
              To keep the data but stop collecting it, edit the field and untick “Show on forms and dashboards” instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              Delete field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
