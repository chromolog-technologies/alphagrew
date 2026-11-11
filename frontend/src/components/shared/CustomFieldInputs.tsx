import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValues } from '../../api/customFieldsApi';

interface CustomFieldInputsProps {
  definitions: CustomFieldDefinition[];
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
  /** Server validation errors keyed by `customFields.<key>` or `<key>`. */
  errors?: Record<string, string>;
  className?: string;
}

const inputClass =
  'w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100';

/**
 * Inputs for an entity's admin-defined custom fields, styled like the workspace forms.
 * Renders nothing when the institution has not defined any fields.
 */
export function CustomFieldInputs({ definitions, values, onChange, errors = {}, className }: CustomFieldInputsProps) {
  if (definitions.length === 0) return null;

  const set = (key: string, value: CustomFieldValue) => onChange({ ...values, [key]: value });

  return (
    <fieldset className={className ?? 'grid gap-4 md:col-span-2 md:grid-cols-2'}>
      <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">Additional details</legend>
      {definitions.map((definition) => {
        const id = `cf-${definition.entity}-${definition.key}`;
        const value = values[definition.key];
        const error = errors[`customFields.${definition.key}`] ?? errors[definition.key];

        return (
          <div key={definition.id} className={`space-y-2 text-sm font-medium text-slate-700 ${definition.type === 'multiselect' ? 'md:col-span-2' : ''}`}>
            <label htmlFor={id} className="block">
              {definition.label}
              {definition.isRequired ? <span className="text-red-500"> *</span> : null}
            </label>
            <FieldInput id={id} definition={definition} value={value} onChange={(next) => set(definition.key, next)} />
            {definition.helpText ? <p className="text-xs font-normal text-slate-500">{definition.helpText}</p> : null}
            {error ? <p className="text-xs font-normal text-red-600" role="alert">{error}</p> : null}
          </div>
        );
      })}
    </fieldset>
  );
}

function FieldInput({ id, definition, value, onChange }: {
  id: string;
  definition: CustomFieldDefinition;
  value: CustomFieldValue | undefined;
  onChange: (value: CustomFieldValue) => void;
}) {
  switch (definition.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2 font-normal">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          Yes
        </label>
      );

    case 'select':
      return (
        <select id={id} required={definition.isRequired} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          <option value="">Choose…</option>
          {definition.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div id={id} role="group" aria-label={definition.label} className="flex flex-wrap gap-3 font-normal">
          {definition.options.map((option) => (
            <label key={option} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])}
              />
              {option}
            </label>
          ))}
        </div>
      );
    }

    default:
      return (
        <input
          id={id}
          type={definition.type === 'number' ? 'number' : definition.type === 'date' ? 'date' : 'text'}
          step={definition.type === 'number' ? 'any' : undefined}
          maxLength={definition.type === 'text' ? 1000 : undefined}
          required={definition.isRequired}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      );
  }
}
