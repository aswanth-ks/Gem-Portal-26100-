import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export type Status =
  | 'open'
  | 'closing-soon'
  | 'closed'
  | 'under-evaluation'
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'verified'
  | 'pending'
  | 'action-required'
  | 'eligible'
  | 'not-eligible'
  | 'mandatory'
  | 'conditional'
  | 'uploaded'
  | 'active'
  | 'sealed';

const STATUS: Record<Status, { label: string; tone: Tone; icon?: string; pulse?: boolean; spin?: boolean }> = {
  open: { label: 'Open', tone: 'success' },
  'closing-soon': { label: 'Closing soon', tone: 'warning', pulse: true },
  closed: { label: 'Closed', tone: 'neutral' },
  'under-evaluation': { label: 'Under evaluation', tone: 'info' },
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'success', icon: 'check_circle' },
  processing: { label: 'Processing', tone: 'warning', icon: 'sync', spin: true },
  verified: { label: 'Verified', tone: 'success', icon: 'verified' },
  pending: { label: 'Pending', tone: 'neutral' },
  'action-required': { label: 'Action required', tone: 'danger', icon: 'error' },
  eligible: { label: 'Eligible', tone: 'success', icon: 'check_circle' },
  'not-eligible': { label: 'Not eligible', tone: 'danger', icon: 'cancel' },
  mandatory: { label: 'Mandatory', tone: 'danger' },
  conditional: { label: 'Conditional', tone: 'warning' },
  uploaded: { label: 'Uploaded', tone: 'success', icon: 'check_circle' },
  active: { label: 'Active', tone: 'info' },
  sealed: { label: 'Sealed', tone: 'success', icon: 'lock' },
};

const TONE: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: 'bg-success-container text-success-on-container border-success-border', dot: 'bg-success' },
  warning: { pill: 'bg-warning-container text-warning-on-container border-warning-border', dot: 'bg-warning' },
  danger: { pill: 'bg-danger-container text-danger-on-container border-danger-border', dot: 'bg-danger' },
  info: { pill: 'bg-info-container text-info-on-container border-info-border', dot: 'bg-info' },
  neutral: { pill: 'bg-neutral-container text-neutral-on-container border-neutral-border', dot: 'bg-neutral' },
  brand: { pill: 'bg-navy text-white border-navy', dot: 'bg-saffron' },
};

interface StatusBadgeProps {
  status?: Status;
  tone?: Tone;
  icon?: string;
  children?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * One status vocabulary for the whole product. Pass `status` for a known
 * state, or `tone` + children for a custom label on the same visual system.
 * Always shows a dot or icon so status never relies on color alone.
 */
export function StatusBadge({ status, tone, icon, children, size = 'sm', className }: StatusBadgeProps) {
  const def = status ? STATUS[status] : undefined;
  const t = tone ?? def?.tone ?? 'neutral';
  const ic = icon ?? def?.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium',
        size === 'sm' ? 'h-6 px-2.5 text-[12px]' : 'h-7 px-3 text-[13px]',
        TONE[t].pill,
        className,
      )}
    >
      {ic ? (
        <Icon name={ic} size="xs" spin={def?.spin} />
      ) : (
        <span className="relative flex h-1.5 w-1.5">
          {def?.pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', TONE[t].dot)} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', TONE[t].dot)} />
        </span>
      )}
      {children ?? def?.label}
    </span>
  );
}

/** Quiet tag for categories / types (no status meaning). */
export function Tag({ children, icon, className, mono }: { children: ReactNode; icon?: string; className?: string; mono?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-6 px-2 rounded-md bg-surface-container-low border border-outline-variant/80 text-[12px] font-medium text-on-surface-variant whitespace-nowrap',
        mono && 'font-mono text-[11.5px] text-on-surface',
        className,
      )}
    >
      {icon && <Icon name={icon} size="xs" />}
      {children}
    </span>
  );
}

/** Compact numeric count badge (tabs, nav). */
export function CountBadge({ children, active, tone }: { children: ReactNode; active?: boolean; tone?: 'danger' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold num',
        tone === 'danger'
          ? 'bg-danger text-white'
          : tone === 'warning'
            ? 'bg-warning-container text-warning-on-container'
            : active
              ? 'bg-secondary text-white'
              : 'bg-surface-container text-on-surface-variant',
      )}
    >
      {children}
    </span>
  );
}
