import { Router } from 'express';
import { requireOfficer } from '../../middleware/auth.js';
import { officerTendersRouter } from './tenders.routes.js';
import { officerDocumentsRouter } from './documents.routes.js';
import { officerRequirementsRouter } from './requirements.routes.js';
import { officerRulesRouter } from './rules.routes.js';
import { officerBidsRouter } from './bids.routes.js';
import { officerDashboardRouter } from './dashboard.routes.js';

export const officerRouter = Router();
officerRouter.use(requireOfficer);

officerRouter.use('/tenders', officerTendersRouter);
// These mount at the officer root because their own paths already start
// with /tenders/:id/... or /documents|requirements|rules/:id — see each
// file for its exact routes.
officerRouter.use('/', officerDocumentsRouter);
officerRouter.use('/', officerRequirementsRouter);
officerRouter.use('/', officerRulesRouter);
officerRouter.use('/', officerBidsRouter);
officerRouter.use('/', officerDashboardRouter);
