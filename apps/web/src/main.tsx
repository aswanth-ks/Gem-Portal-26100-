import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from '@/routes/AppRouter';
import '@/styles/index.css';

// Entry point only. Do NOT add business logic here — see app/ for app shell
// composition and routes/ for routing.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
