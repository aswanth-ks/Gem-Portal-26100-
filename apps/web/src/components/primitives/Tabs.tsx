import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { CountBadge } from './StatusBadge';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  count?: ReactNode;
  countTone?: 'danger' | 'warning';
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'underline' | 'pills';
  className?: string;
  ariaLabel?: string;
}

/** Underline tabs (page-level filters) or pill tabs (in-page section nav). */
export function Tabs<T extends string>({ items, value, onChange, variant = 'underline', className, ariaLabel }: TabsProps<T>) {
  if (variant === 'pills') {
    return (
      <div role="tablist" aria-label={ariaLabel} className={cn('flex min-w-0 max-w-full items-center gap-1 overflow-x-auto scroll-thin', className)}>
        {items.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              type="button"
              className={cn(
                'focus-ring inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-control px-3.5 text-[13.5px] font-medium transition-all',
                active ? 'bg-navy text-white shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {t.label}
              {t.count !== undefined && <CountBadge tone={t.countTone}>{t.count}</CountBadge>}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex min-w-0 max-w-full items-center gap-6 overflow-x-auto scroll-thin border-b border-outline-variant', className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            type="button"
            className={cn(
              'focus-ring relative -mb-px inline-flex h-12 items-center gap-2 whitespace-nowrap border-b-2 text-[14px] transition-colors',
              active ? 'border-secondary font-semibold text-on-surface' : 'border-transparent font-medium text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t.label}
            {t.count !== undefined && <CountBadge active={active} tone={t.countTone}>{t.count}</CountBadge>}
          </button>
        );
      })}
    </div>
  );
}
