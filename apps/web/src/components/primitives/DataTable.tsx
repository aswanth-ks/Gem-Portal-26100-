import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Scroll container + table. Scrolls horizontally inside its card on small screens. */
export function Table({ children, className, minWidth = 720 }: { children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn('w-full overflow-x-auto scroll-thin', className)}>
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children, sticky }: { children: ReactNode; sticky?: boolean }) {
  return <thead className={cn('bg-surface-container-low', sticky && 'sticky top-0 z-10')}>{children}</thead>;
}

export function Th({ className, align, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      {...rest}
      className={cn(
        'h-11 px-5 text-[12px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant border-b border-outline-variant whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    />
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-outline-variant/70">{children}</tbody>;
}

export function Tr({ className, highlight, ...rest }: HTMLAttributes<HTMLTableRowElement> & { highlight?: 'warning' | 'danger' | 'info' }) {
  return (
    <tr
      {...rest}
      className={cn(
        'transition-colors hover:bg-surface-container-low/80',
        highlight === 'warning' && 'bg-warning-container/40',
        highlight === 'danger' && 'bg-danger-container/40',
        highlight === 'info' && 'bg-info-container/40',
        className,
      )}
    />
  );
}

export function Td({ className, align, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      {...rest}
      className={cn('px-5 py-4 align-middle text-[14px] text-on-surface', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}
    />
  );
}

/** Two-line cell: primary text + muted secondary line. */
export function CellStack({ primary, secondary, mono }: { primary: ReactNode; secondary?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={cn('font-medium text-on-surface', mono && 'font-mono text-[13px]')}>{primary}</span>
      {secondary && <span className="text-body-sm text-on-surface-variant">{secondary}</span>}
    </div>
  );
}
