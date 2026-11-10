/**
 * Custom form fields that institution admins add to students, staff, subjects and exams.
 * Values are sent as `customFields: { key: value }` with a record, or saved on their own
 * through the values endpoint (used for records whose forms don't send them).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export type CustomFieldEntity = 'student' | 'staff' | 'subject' | 'exam';
export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
export type CustomFieldValue = string | number | boolean | string[] | null;
export type CustomFieldValues = Record<string, CustomFieldValue>;

export interface CustomFieldDefinition {
  id: number;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  helpText: string | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CustomFieldInput {
  entity?: CustomFieldEntity;
  key?: string;
  label?: string;
  type?: CustomFieldType;
  options?: string[];
  helpText?: string | null;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export const CUSTOM_FIELD_ENTITIES: { value: CustomFieldEntity; label: string }[] = [
  { value: 'student', label: 'Students' },
  { value: 'staff', label: 'Staff' },
  { value: 'subject', label: 'Subjects' },
  { value: 'exam', label: 'Exams' },
];

export const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown (one choice)' },
  { value: 'multiselect', label: 'Checkboxes (several choices)' },
];

export const customFieldsApi = {
  list: (entity?: CustomFieldEntity, includeInactive = false) =>
    http
      .get<{ data: CustomFieldDefinition[] }>('/custom-fields', { entity, includeInactive: includeInactive ? 1 : undefined })
      .then((r) => r.data),
  create: (input: CustomFieldInput) => http.post<{ data: CustomFieldDefinition }>('/custom-fields', input).then((r) => r.data),
  update: (id: number, input: CustomFieldInput) =>
    http.patch<{ data: CustomFieldDefinition }>(`/custom-fields/${id}`, input).then((r) => r.data),
  remove: (id: number) => http.delete<{ message: string }>(`/custom-fields/${id}`),
  values: (entity: CustomFieldEntity, id: number) =>
    http.get<{ data: CustomFieldValues }>(`/custom-fields/values/${entity}/${id}`).then((r) => r.data),
  saveValues: (entity: CustomFieldEntity, id: number, customFields: CustomFieldValues) =>
    http.put<{ data: CustomFieldValues }>(`/custom-fields/values/${entity}/${id}`, { customFields }).then((r) => r.data),
};

export const customFieldKeys = {
  all: ['custom-fields'] as const,
  definitions: (entity?: CustomFieldEntity, includeInactive = false) => ['custom-fields', 'definitions', entity ?? 'all', includeInactive] as const,
  values: (entity: CustomFieldEntity, id: number) => ['custom-fields', 'values', entity, id] as const,
};

export function useCustomFieldDefinitions(entity?: CustomFieldEntity, options: { includeInactive?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: customFieldKeys.definitions(entity, options.includeInactive),
    queryFn: () => customFieldsApi.list(entity, options.includeInactive),
    enabled: options.enabled ?? true,
  });
}

export function useCustomFieldValues(entity: CustomFieldEntity, id: number | null | undefined) {
  return useQuery({
    queryKey: customFieldKeys.values(entity, id ?? 0),
    queryFn: () => customFieldsApi.values(entity, id as number),
    enabled: Boolean(id),
  });
}

export function useSaveCustomField() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: CustomFieldInput }) =>
      id === null ? customFieldsApi.create(input) : customFieldsApi.update(id, input),
    // Field changes also change what dashboards can query.
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: customFieldKeys.all }),
      client.invalidateQueries({ queryKey: ['dashboards', 'sources'] }),
    ]),
  });
}

export function useDeleteCustomField() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customFieldsApi.remove(id),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: customFieldKeys.all }),
      client.invalidateQueries({ queryKey: ['dashboards', 'sources'] }),
    ]),
  });
}

/** Default value for an empty input of each type. */
export function emptyValue(type: CustomFieldType): CustomFieldValue {
  return type === 'multiselect' ? [] : type === 'boolean' ? false : '';
}

/**
 * Values ready to send: empty inputs become null (which clears the value), numbers become
 * numbers. Booleans are always sent, so "No" is stored as an answer.
 */
export function toPayload(definitions: CustomFieldDefinition[], values: CustomFieldValues): CustomFieldValues {
  const payload: CustomFieldValues = {};

  for (const definition of definitions) {
    if (!(definition.key in values)) continue;
    const value = values[definition.key];

    if (definition.type === 'number') {
      payload[definition.key] = value === '' || value === null ? null : Number(value);
    } else if (definition.type === 'multiselect') {
      payload[definition.key] = Array.isArray(value) && value.length ? value : null;
    } else if (definition.type === 'boolean') {
      payload[definition.key] = Boolean(value);
    } else {
      payload[definition.key] = value === '' ? null : value;
    }
  }

  return payload;
}
