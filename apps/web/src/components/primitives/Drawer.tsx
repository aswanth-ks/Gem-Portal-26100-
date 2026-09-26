import { useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import { IconButton } from './Button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Right-side panel for inspecting or editing one record without leaving the
 * page (requirement detail, rule detail, audit event, row actions…). Same
 * interaction contract as `Modal` — Esc + backdrop close, scroll-locked body
 * — but slides in from the right and is meant for one focused record rather
 * than a short confirmation.
 */
export function Drawer({ open, onClose, title, description, eyebrow, icon, size = 'md', footer, children }: DrawerProps) {
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
  const width = { sm: 'max-w-[400px]', md: 'max-w-[480px]', lg: 'max-w-[560px]' }[size];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-navy-900/50 backdrop-blur-[2px] animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" className={cn('flex h-full w-full flex-col bg-surface-container-lowest shadow-overlay animate-slide-in-right', width)}>
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                <Icon name={icon} size="lg" />
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <div className="mb-0.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">{eyebrow}</div>}
              <h2 className="truncate text-headline-md text-on-surface">{title}</h2>
              {description && <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>}
            </div>
          </div>
          <IconButton icon="close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-outline-variant bg-surface-container-low px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}
