import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link' | 'brand' | 'saffron';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-secondary text-on-secondary shadow-xs hover:bg-secondary-container active:bg-on-secondary-fixed-variant',
  brand: 'bg-navy text-white shadow-xs hover:bg-navy-700 active:bg-navy-900',
  secondary: 'bg-surface-container-lowest text-on-surface border border-outline-variant shadow-xs hover:bg-surface-container-low hover:border-outline/40',
  outline: 'bg-transparent text-secondary border border-secondary/40 hover:bg-info-container hover:border-secondary/60',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  danger: 'bg-danger text-white shadow-xs hover:bg-danger-on-container',
  link: 'bg-transparent text-secondary hover:text-secondary-container underline-offset-4 hover:underline !px-0 !h-auto',
  saffron: 'bg-saffron text-navy shadow-xs hover:brightness-95',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 gap-1.5 text-[13px] rounded-control',
  md: 'h-10 px-4 gap-2 text-[14px] rounded-control',
  lg: 'h-12 px-6 gap-2 text-[15px] rounded-control',
};

const ICON_SIZE: Record<ButtonSize, 'sm' | 'md' | 'lg'> = { sm: 'sm', md: 'md', lg: 'lg' };

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: string;
  rightIcon?: string;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

type ButtonProps = BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { to?: undefined };
type LinkProps = BaseProps & { to: string; onClick?: () => void; 'aria-label'?: string; disabled?: boolean };

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, className, disabled }: BaseProps & { disabled?: boolean }) {
  return cn(
    'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none transition-all focus-ring',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    disabled && 'opacity-50 pointer-events-none',
    className,
  );
}

/** The one button for the whole product. Pass `to` to render a router link. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', size = 'md', leftIcon, rightIcon, loading, fullWidth, className, children } = props;
  const content = (
    <>
      {loading ? <Icon name="progress_activity" size={ICON_SIZE[size]} spin /> : leftIcon && <Icon name={leftIcon} size={ICON_SIZE[size]} />}
      {children}
      {rightIcon && !loading && <Icon name={rightIcon} size={ICON_SIZE[size]} />}
    </>
  );

  if ('to' in props && props.to !== undefined) {
    return (
      <Link
        aria-label={props['aria-label']}
        className={buttonClasses({ variant, size, fullWidth, className, disabled: props.disabled })}
        onClick={props.onClick}
        to={props.to}
      >
        {content}
      </Link>
    );
  }

  const { variant: _v, size: _s, leftIcon: _l, rightIcon: _r, loading: _lo, fullWidth: _f, className: _c, children: _ch, type = 'button', disabled, ...rest } =
    props as ButtonProps;
  return (
    <button {...rest} className={buttonClasses({ variant, size, fullWidth, className })} disabled={disabled || loading} type={type} aria-busy={loading || undefined}>
      {content}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  icon: string;
  'aria-label': string;
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: 'sm' | 'md';
  active?: boolean;
  badge?: boolean;
  className?: string;
}

/** Square icon-only button. `aria-label` is required. */
export function IconButton({ icon, variant = 'ghost', size = 'md', active, badge, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cn(
        'relative inline-flex items-center justify-center rounded-control transition-all focus-ring disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        variant === 'ghost' && 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        variant === 'secondary' && 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant shadow-xs hover:text-on-surface hover:bg-surface-container-low',
        variant === 'primary' && 'bg-secondary text-white hover:bg-secondary-container',
        active && 'text-secondary bg-info-container',
        className,
      )}
    >
      <Icon name={icon} size={size === 'sm' ? 'sm' : 'lg'} fill={active} />
      {badge && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-container-lowest" />}
    </button>
  );
}
