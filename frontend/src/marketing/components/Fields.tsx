import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/**
 * Labelled form controls. Each wires its label, hint and error to the control with
 * htmlFor / aria-describedby / aria-invalid, so callers only pass text.
 */

interface FieldChrome {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

function useFieldIds(error?: string, hint?: string) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return { id, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined };
}

function FieldShell({
  id,
  label,
  hint,
  hintId,
  error,
  errorId,
  required,
  className,
  children,
}: FieldChrome & { id: string; hintId?: string; errorId?: string; children: ReactNode }) {
  return (
    <div className={cn('mk-field', className)}>
      <label htmlFor={id} className="mk-label">
        {label}
        {required ? (
          <span className="ml-0.5 text-red-700" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 font-normal text-ink-500">(optional)</span>
        )}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="mk-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mk-error-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: FieldChrome & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const ids = useFieldIds(error, hint);
  return (
    <FieldShell {...ids} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={ids.id}
        className="mk-input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: FieldChrome & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  const ids = useFieldIds(error, hint);
  return (
    <FieldShell {...ids} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={ids.id}
        className="mk-input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  className,
  options,
  ...props
}: FieldChrome & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & { options: readonly string[] }) {
  const ids = useFieldIds(error, hint);
  return (
    <FieldShell {...ids} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={ids.id}
        className="mk-input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...props}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxGroup({
  legend,
  name,
  options,
  values,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="mk-field">
      <legend className="mk-label mb-2">
        {legend} <span className="font-normal text-ink-500">(optional)</span>
      </legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="mk-check">
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={values.includes(option)}
              onChange={(event) =>
                onChange(event.target.checked ? [...values, option] : values.filter((value) => value !== option))
              }
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
