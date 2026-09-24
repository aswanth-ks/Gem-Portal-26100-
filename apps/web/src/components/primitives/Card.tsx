import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

type Padding = 'none' | 'sm' | 'md' | 'lg';
type Tone = 'default' | 'subtle' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
};

const TONE: Record<Tone, string> = {
  default: 'bg-surface-container-lowest border border-outline-variant shadow-card',
  subtle: 'bg-surface-container-low border border-outline-variant/70',
  brand: 'bg-navy text-white border border-navy-700 shadow-card',
  info: 'bg-info-container border border-info-border',
  success: 'bg-success-container border border-success-border',
  warning: 'bg-warning-container border border-warning-border',
  danger: 'bg-danger-container border border-danger-border',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  tone?: Tone;
  interactive?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

/** The one surface for the whole product. */
export function Card({ padding = 'md', tone = 'default', interactive, as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        'rounded-card',
        TONE[tone],
        PADDING[padding],
        interactive && 'transition-all hover:shadow-card-hover hover:-translate-y-px hover:border-outline/30',
        className,
      )}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: string;
  actions?: ReactNode;
  className?: string;
}

/** Title row for a Card: optional icon chip, title, muted description, right-aligned actions. */
export function CardHeader({ title, description, icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 mb-5', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
            <Icon name={icon} size="md" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-headline-sm text-on-surface">{title}</h3>
          {description && <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Divider({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn(vertical ? 'w-px self-stretch bg-outline-variant' : 'h-px w-full bg-outline-variant', className)} />;
}
