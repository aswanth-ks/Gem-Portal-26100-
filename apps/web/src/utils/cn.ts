/** Joins truthy class names. Tiny stand-in for clsx — no dependency needed. */
export function cn(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
