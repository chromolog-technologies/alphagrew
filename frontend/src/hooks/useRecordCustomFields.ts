/**
 * Custom fields inside a standard record form (staff, department, course, subject, designation,
 * company): loads the institution's field definitions and, when editing, the record's stored
 * values; keeps the form's values; builds the `customFields` payload sent with the record; and
 * picks the custom field errors out of a failed save.
 *
 * Usage: `const cf = useRecordCustomFields('course', editingId, showForm);` then render
 * `<CustomFieldInputs definitions={cf.fields} values={cf.values} onChange={cf.setValues} errors={cf.errors} />`
 * and send `{ ...payload, ...cf.payload() }`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/apiError';
import {
  emptyValue,
  toPayload,
  useCustomFieldDefinitions,
  useCustomFieldValues,
  type BuiltInCustomFieldEntity,
  type CustomFieldValues,
} from '../api/customFieldsApi';
import { isApiConfigured } from '../api/http';

export function useRecordCustomFields(entity: BuiltInCustomFieldEntity, recordId: number | null | undefined, active: boolean) {
  const enabled = active && isApiConfigured();
  const definitions = useCustomFieldDefinitions(entity, { enabled });
  const stored = useCustomFieldValues(entity, enabled ? recordId : null);
  const fields = useMemo(() => definitions.data ?? [], [definitions.data]);

  const [values, setValues] = useState<CustomFieldValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A new form starts empty; an edit form starts from the record's stored values.
  useEffect(() => {
    if (!active) return;
    setValues(recordId ? stored.data ?? {} : {});
    setErrors({});
  }, [active, recordId, stored.data]);

  /** `{ customFields }` to spread into the save request, or `{}` when the entity has no fields. */
  const payload = useCallback((): { customFields?: CustomFieldValues } => {
    if (fields.length === 0) return {};
    // Every field is sent (empty ones as null), so required fields left blank are reported.
    const complete = { ...Object.fromEntries(fields.map((field) => [field.key, emptyValue(field.type)])), ...values };
    return { customFields: toPayload(fields, complete) };
  }, [fields, values]);

  /** Keeps the custom field messages of a failed save; returns true when there were any. */
  const captureErrors = useCallback((error: unknown): boolean => {
    const fieldErrors = error instanceof ApiError ? error.firstFieldErrors : {};
    const custom = Object.fromEntries(Object.entries(fieldErrors).filter(([key]) => key === 'customFields' || key.startsWith('customFields.')));
    setErrors(custom);
    return Object.keys(custom).length > 0;
  }, []);

  return {
    fields,
    values,
    setValues,
    errors,
    payload,
    captureErrors,
    clearErrors: () => setErrors({}),
    isLoading: definitions.isLoading || (Boolean(recordId) && stored.isLoading),
  };
}
