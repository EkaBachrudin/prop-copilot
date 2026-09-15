import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, leftIcon, rightAction, className, id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;

  return (
    <div className="input__wrapper">
      {label ? (
        <label htmlFor={inputId} className="input__label">
          {label}
        </label>
      ) : null}
      <div className="input__field-wrapper">
        {leftIcon ? (
          <span className="input__left-icon" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input__field',
            leftIcon && 'input__field--with-left-icon',
            error && 'input__field--error',
            className
          )}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {rightAction ? <span className="input__right-action">{rightAction}</span> : null}
      </div>
      {error ? (
        <p className="input__error">{error}</p>
      ) : helperText ? (
        <p className="input__helper">{helperText}</p>
      ) : null}
    </div>
  );
});
