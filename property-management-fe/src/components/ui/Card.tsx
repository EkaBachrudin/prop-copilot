import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cn('card', `card--${padding}`, className)} {...rest}>
      {children}
    </div>
  );
});
