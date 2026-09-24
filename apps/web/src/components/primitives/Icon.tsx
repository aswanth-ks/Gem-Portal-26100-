import { cn } from '@/utils/cn';

const SIZES = { xs: 'text-[14px]', sm: 'text-[16px]', md: 'text-[18px]', lg: 'text-[20px]', xl: 'text-[24px]', '2xl': 'text-[32px]' };

export interface IconProps {
  name: string;
  size?: keyof typeof SIZES;
  fill?: boolean;
  className?: string;
  spin?: boolean;
}

/** Material Symbols icon with a fixed size scale. Decorative by default. */
export function Icon({ name, size = 'md', fill, className, spin }: IconProps) {
  return (
    <span aria-hidden="true" className={cn('material-symbols-outlined', SIZES[size], fill && 'icon-fill', spin && 'animate-spin', className)}>
      {name}
    </span>
  );
}
