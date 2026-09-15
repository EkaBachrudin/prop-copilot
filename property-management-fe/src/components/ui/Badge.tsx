import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import './Badge.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'gray' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'gray', className, children, ...rest },
  ref
) {
  return (
    <span ref={ref} className={cn('badge', `badge--${variant}`, className)} {...rest}>
      {children}
    </span>
  );
});
