// Express application assembly: middleware + route mounting only.
// Business logic belongs in routes/models/utils, not here.
//
// Phase 1: real bidder auth + tenders (read) + bid drafts/submission +
// private document upload/download.
// Phase 2: real officer tender/document/requirement/rule persistence under
// /api/officer, gated by requireOfficer (middleware/auth.ts): a verified JWT
// carrying role 'officer', issued by POST /api/auth/officer-login.

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { tendersRouter } from './routes/tenders.routes.js';
import { bidsRouter } from './routes/bids.routes.js';
import { documentsRouter } from './routes/documents.routes.js';
import { languageRouter } from './routes/language.routes.js';
import { officerRouter } from './routes/officer/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/tenders', tendersRouter);
  app.use('/api/bids', bidsRouter);
  app.use('/api/documents', documentsRouter);
  // Phase 9 — BHASHINI translation assistance: public like tender content,
  // never touches bidder-private data or compliance/decision logic.
  app.use('/api/language', languageRouter);
  // Officer resources: gated by requireOfficer inside officerRouter (officer
  // JWT with role 'officer' — see middleware/auth.ts).
  app.use('/api/officer', officerRouter);

  app.use(errorHandler);

  return app;
}
