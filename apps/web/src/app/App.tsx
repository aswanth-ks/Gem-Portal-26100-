// Application shell: composes global providers around the routed page tree.
// AuthProvider is real now (Phase 1 — bidder auth backed by apps/gateway).
// Officer auth is still out of scope and unaffected by this.

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';

interface AppProps {
  children: ReactNode;
}

export function App({ children }: AppProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
