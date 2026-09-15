import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helperText, options, className, id, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;

  return (
    <div className="select__wrapper">
      {label ? (
        <label htmlFor={selectId} className="select__label">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={cn('select__field', error && 'select__field--error', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="select__error">{error}</p>
      ) : helperText ? (
        <p className="select__helper">{helperText}</p>
      ) : null}
    </div>
  );
});
