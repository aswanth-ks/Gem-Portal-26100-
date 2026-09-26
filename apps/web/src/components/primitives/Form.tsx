import { forwardRef, useEffect, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

const CONTROL =
  'w-full h-10 rounded-control border bg-surface-container-lowest px-3.5 text-[14px] text-on-surface placeholder:text-outline ' +
  'transition-all outline-none focus:border-secondary focus:shadow-focus disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed';

type State = 'default' | 'valid' | 'error';

function stateClasses(state: State) {
  return state === 'error' ? 'border-danger focus:border-danger focus:shadow-focus-danger' : 'border-outline-variant hover:border-outline/60';
}

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  helper?: ReactNode;
  error?: ReactNode;
  valid?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + helper/validation text. Labels are always visible. */
export function Field({ label, htmlFor, required, helper, error, valid, aside, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-on-surface">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {valid && !error ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success-on-container">
            <Icon name="check_circle" size="xs" fill />
            {valid}
          </span>
        ) : (
          aside
        )}
      </div>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[12px] font-medium text-danger-on-container" role="alert">
          <Icon name="error" size="xs" />
          {error}
        </p>
      ) : (
        helper && <p className="text-[12px] text-on-surface-variant">{helper}</p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  state?: State;
  leftIcon?: string;
  rightIcon?: string;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { state = 'default', leftIcon, rightIcon, rightSlot, className, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leftIcon && <Icon name={leftIcon} size="md" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />}
      <input
        ref={ref}
        aria-invalid={state === 'error' || undefined}
        {...rest}
        className={cn(CONTROL, stateClasses(state), leftIcon && 'pl-10', (rightIcon || rightSlot) && 'pr-10', className)}
      />
      {rightSlot ? (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
      ) : (
        rightIcon && (
          <Icon
            name={rightIcon}
            size="md"
            className={cn('pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2', state === 'valid' ? 'text-success' : 'text-outline')}
          />
        )
      )}
    </div>
  );
});

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  state?: State;
  size?: 'sm' | 'md';
}

export function Select({ state = 'default', className, children, size = 'md', ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select {...rest} className={cn(CONTROL, stateClasses(state), 'appearance-none pr-10 cursor-pointer', size === 'sm' && '!h-9 text-[13px]', className)}>
        {children}
      </select>
      <Icon name="expand_more" size="md" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
    </div>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

/** Large, card-like checkbox row for declarations and consent. */
export function Checkbox({ label, description, checked, className, ...rest }: CheckboxProps) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer select-none items-start gap-3 rounded-card border p-4 transition-all',
        checked ? 'border-secondary/40 bg-info-container/60' : 'border-outline-variant bg-surface-container-lowest hover:border-outline/50',
        className,
      )}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input {...rest} checked={checked} type="checkbox" className="peer absolute inset-0 h-5 w-5 cursor-pointer opacity-0" />
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-[6px] border transition-all peer-focus-visible:shadow-focus',
            checked ? 'border-secondary bg-secondary text-white' : 'border-outline bg-surface-container-lowest',
          )}
        >
          {checked && <Icon name="check" size="xs" />}
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[14px] font-medium leading-snug text-on-surface">{label}</span>
        {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
      </span>
    </label>
  );
}

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'md' | 'lg';
  shortcut?: boolean;
  onSubmitSearch?: () => void;
  submitLabel?: string;
}

/** Product search field with icon, Ctrl+K hint and optional submit button. */
export function SearchInput({ size = 'lg', shortcut = true, onSubmitSearch, submitLabel, className, ...rest }: SearchInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut || rest.readOnly) return;
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut, rest.readOnly]);

  const lg = size === 'lg';
  return (
    <div
      className={cn(
        'group relative flex items-center rounded-card border border-outline-variant bg-surface-container-lowest shadow-xs transition-all',
        'focus-within:border-secondary focus-within:shadow-focus hover:border-outline/60',
        lg ? 'h-12 pl-4 pr-2' : 'h-10 pl-3 pr-1.5 !rounded-control',
        className,
      )}
    >
      <Icon name="search" size={lg ? 'xl' : 'md'} className="text-outline group-focus-within:text-secondary transition-colors" />
      <input
        ref={ref}
        type="search"
        {...rest}
        className={cn(
          'h-full flex-1 min-w-0 bg-transparent outline-none text-on-surface placeholder:text-outline',
          lg ? 'px-3 text-[15px]' : 'px-2.5 text-[13.5px]',
        )}
      />
      {shortcut && (
        <kbd className="hidden sm:inline-flex items-center gap-0.5 h-6 px-1.5 mr-1.5 rounded-md border border-outline-variant bg-surface-container-low text-[11px] font-medium text-on-surface-variant">
          Ctrl K
        </kbd>
      )}
      {onSubmitSearch && (
        <button
          type="button"
          onClick={onSubmitSearch}
          className="focus-ring h-10 px-5 rounded-control bg-navy text-white text-[14px] font-semibold hover:bg-navy-700 transition-colors"
        >
          {submitLabel ?? 'Search'}
        </button>
      )}
    </div>
  );
}
