import { cn } from '@/utils/cn';
import { Icon } from './Icon';

export interface StepItem {
  label: string;
  description?: string;
}

/** Horizontal guided-workflow stepper: completed / current / upcoming. */
export function Stepper({ steps, current, className }: { steps: StepItem[]; current: number; className?: string }) {
  return (
    <ol className={cn('grid gap-3 md:gap-0', className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const last = i === steps.length - 1;
        return (
          <li key={step.label} className="relative flex flex-col gap-3 md:pr-4" aria-current={active ? 'step' : undefined}>
            <div className="flex items-center">
              <span
                className={cn(
                  'relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold num transition-all',
                  done && 'bg-success text-white',
                  active && 'bg-secondary text-white ring-4 ring-secondary/15',
                  !done && !active && 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant',
                )}
              >
                {done ? <Icon name="check" size="md" /> : n}
              </span>
              {!last && <span className={cn('mx-3 hidden h-0.5 flex-1 rounded-full md:block', done ? 'bg-success' : 'bg-outline-variant')} />}
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className={cn('text-[12px] font-semibold uppercase tracking-[0.06em]', active ? 'text-secondary' : done ? 'text-success-on-container' : 'text-outline')}>
                Step {n} · {done ? 'Completed' : active ? 'In progress' : 'Upcoming'}
              </div>
              <div className={cn('mt-0.5 text-[15px] font-semibold', active || done ? 'text-on-surface' : 'text-on-surface-variant')}>{step.label}</div>
              {step.description && <div className="mt-0.5 text-body-sm text-on-surface-variant">{step.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
