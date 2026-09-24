import { useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import { IconButton } from './Button';

interface EmptyStateProps {
  icon?: string;
  tone?: 'neutral' | 'danger' | 'success' | 'warning';
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Empty / error / result state: what happened, why, and what to do next. */
export function EmptyState({ icon = 'inbox', tone = 'neutral', title, description, actions, children, className }: EmptyStateProps) {
  const chip = {
    neutral: 'bg-surface-container text-on-surface-variant',
    danger: 'bg-danger-container text-danger',
    success: 'bg-success-container text-success',
    warning: 'bg-warning-container text-warning-on-container',
  }[tone];
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <span className={cn('mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full', chip)}>
        <Icon name={icon} size="xl" />
      </span>
      <h3 className="text-headline-md text-on-surface">{title}</h3>
      {description && <p className="mt-2 max-w-md text-body-md text-on-surface-variant">{description}</p>}
      {children && <div className="mt-6 w-full max-w-2xl">{children}</div>}
      {actions && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-container', className)} />;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: string;
  tone?: 'default' | 'brand';
  size?: 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  children: ReactNode;
}

/** Accessible dialog: Esc and backdrop close, scroll-locked body. */
export function Modal({ open, onClose, title, description, icon, tone = 'default', size = 'lg', footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-900/50 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cn('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel bg-surface-container-lowest shadow-overlay animate-scale-in sm:rounded-panel', width)}>
        <div className={cn('flex items-start justify-between gap-4 px-6 py-5 border-b', tone === 'brand' ? 'bg-navy text-white border-navy-700' : 'border-outline-variant')}>
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control', tone === 'brand' ? 'bg-white/10 text-saffron' : 'bg-info-container text-secondary')}>
                <Icon name={icon} size="lg" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className={cn('text-headline-md', tone === 'brand' ? 'text-white' : 'text-on-surface')}>{title}</h2>
              {description && <p className={cn('mt-0.5 text-body-sm', tone === 'brand' ? 'text-white/70' : 'text-on-surface-variant')}>{description}</p>}
            </div>
          </div>
          <IconButton icon="close" aria-label="Close dialog" onClick={onClose} className={tone === 'brand' ? '!text-white/80 hover:!bg-white/10' : ''} />
        </div>
        <div className="overflow-y-auto scroll-thin px-6 py-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-outline-variant bg-surface-container-low px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Transient toast, bottom-right. */
export function Toast({ message, icon = 'check_circle' }: { message: ReactNode; icon?: string }) {
  return (
    <div role="status" className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-card bg-navy px-4 py-3 text-[14px] text-white shadow-overlay animate-slide-up">
      <Icon name={icon} size="lg" className="text-saffron" />
      {message}
    </div>
  );
}
