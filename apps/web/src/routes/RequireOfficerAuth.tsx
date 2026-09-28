import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getOfficerSession } from '@/lib/api';

/**
 * Wraps the officer-only routes. A missing/expired officer JWT goes straight
 * to officer login; the gateway still verifies the token on every request.
 */
export function RequireOfficerAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!getOfficerSession()) return <Navigate to="/officer/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
