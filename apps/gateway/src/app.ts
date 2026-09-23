// Express application assembly: middleware + route mounting only.
// Business logic belongs in services/, not here.
// TODO: mount real routers once implemented (auth, users, tenders, documents,
// intelligence, verification, consent, audit).

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway' });
  });

  // TODO: app.use('/api/auth', authRouter);
  // TODO: app.use('/api/users', usersRouter);
  // TODO: app.use('/api/tenders', tendersRouter);
  // TODO: app.use('/api/documents', documentsRouter);
  // TODO: app.use('/api/intelligence', intelligenceRouter);
  // TODO: app.use('/api/verification', verificationRouter);
  // TODO: app.use('/api/consent', consentRouter);
  // TODO: app.use('/api/audit', auditRouter);

  return app;
}
