// Application shell: composes global providers (state, theme, auth context)
// around the routed page tree. Kept separate from main.tsx so it can be
// unit-tested / wrapped independently.
//
// TODO: wrap with state provider (src/store) and auth provider (features/auth)
// once those are implemented.

import type { ReactNode } from 'react';

interface AppProps {
  children: ReactNode;
}

export function App({ children }: AppProps) {
  return <>{children}</>;
}
