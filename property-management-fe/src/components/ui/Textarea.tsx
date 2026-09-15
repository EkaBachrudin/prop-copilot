import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import './Textarea.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, className, id, ...rest },
  ref
) {
  const generatedId = useId();
  const textareaId = id ?? `textarea-${generatedId}`;

  return (
    <div className="textarea__wrapper">
      {label ? (
        <label htmlFor={textareaId} className="textarea__label">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn('textarea__field', error && 'textarea__field--error', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="textarea__error">{error}</p>
      ) : helperText ? (
        <p className="textarea__helper">{helperText}</p>
      ) : null}
    </div>
  );
});
