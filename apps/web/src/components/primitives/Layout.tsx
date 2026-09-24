import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

export interface Crumb {
  label: ReactNode;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1.5 text-[13px] text-on-surface-variant', className)}>
      {items.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <Icon name="chevron_right" size="sm" className="text-outline" />}
          {c.to ? (
            <Link to={c.to} className="focus-ring rounded hover:text-secondary transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? 'font-medium text-on-surface' : ''}>{c.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

interface PageHeaderProps {
  breadcrumbs?: Crumb[];
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Breadcrumb → eyebrow → title → description → actions. The title gets room to breathe. */
export function PageHeader({ breadcrumbs, eyebrow, title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-5', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl flex-col gap-2.5">
          {eyebrow && <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>}
          <h1 className="text-headline-xl-mobile sm:text-page-title text-on-surface">{title}</h1>
          {description && <p className="text-body-lg text-on-surface-variant">{description}</p>}
          {meta && <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-on-surface-variant">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  index?: string;
  icon?: string;
  actions?: ReactNode;
  className?: string;
  id?: string;
}

/** Heading for a page section (sits above cards, or at the top of a large card). */
export function SectionHeader({ title, description, index, icon, actions, className, id }: SectionHeaderProps) {
  return (
    <div id={id} className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3.5 min-w-0">
        {(index || icon) && (
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-outline-variant bg-surface-container-low text-[13px] font-semibold text-secondary num">
            {icon ? <Icon name={icon} size="lg" /> : index}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          {description && <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
  children?: ReactNode;
}

const STAT_TONE = {
  info: 'bg-info-container text-secondary',
  success: 'bg-success-container text-success-on-container',
  warning: 'bg-warning-container text-warning-on-container',
  danger: 'bg-danger-container text-danger-on-container',
  neutral: 'bg-neutral-container text-neutral',
};

/** KPI / key-fact tile. */
export function StatCard({ label, value, hint, icon, tone = 'info', className, children }: StatCardProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-5 shadow-card', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">{label}</span>
        {icon && (
          <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-control', STAT_TONE[tone])}>
            <Icon name={icon} size="md" />
          </span>
        )}
      </div>
      <div className="text-[26px] font-semibold leading-8 tracking-tight text-on-surface num">{value}</div>
      {hint && <div className="text-body-sm text-on-surface-variant">{hint}</div>}
      {children}
    </div>
  );
}

/** Key/value row list used on detail/review pages. */
export function DescriptionList({ items, className, columns = 1 }: { items: { label: ReactNode; value: ReactNode }[]; className?: string; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cn(
        'grid gap-x-8',
        columns === 1 && 'grid-cols-1 divide-y divide-outline-variant/70',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2 gap-y-5',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5',
        className,
      )}
    >
      {items.map((it, i) =>
        columns === 1 ? (
          <div key={i} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <dt className="text-body-sm text-on-surface-variant">{it.label}</dt>
            <dd className="text-[14px] font-medium text-on-surface sm:text-right">{it.value}</dd>
          </div>
        ) : (
          <div key={i} className="flex flex-col gap-1">
            <dt className="text-[12px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">{it.label}</dt>
            <dd className="text-[14px] font-medium text-on-surface">{it.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

/** Informational callout (notice, advisory, warning). */
export function Callout({
  tone = 'info',
  icon,
  title,
  children,
  actions,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: string;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'bg-info-container/70 border-info-border text-info-on-container',
    success: 'bg-success-container border-success-border text-success-on-container',
    warning: 'bg-warning-container border-warning-border text-warning-on-container',
    danger: 'bg-danger-container border-danger-border text-danger-on-container',
    neutral: 'bg-surface-container-low border-outline-variant text-on-surface-variant',
  }[tone];
  const defaultIcon = { info: 'info', success: 'check_circle', warning: 'warning', danger: 'error', neutral: 'info' }[tone];
  return (
    <div className={cn('flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-start', styles, className)}>
      <Icon name={icon ?? defaultIcon} size="lg" className="mt-px" />
      <div className="flex-1 min-w-0 text-body-md">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5', 'text-on-surface-variant [&_strong]:text-on-surface')}>{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
