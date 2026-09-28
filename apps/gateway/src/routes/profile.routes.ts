import { Router } from 'express';
import { z } from 'zod';
import { BidderProfile } from '../models/BidderProfile.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncRoute, ApiError } from '../middleware/errorHandler.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

// Reads/writes are always scoped to req.userId — there is no route that
// takes a profile/user id from the client, so one bidder can never fetch or
// change another bidder's profile through this router.
profileRouter.get(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const profile = await BidderProfile.findOne({ userId: req.userId });
    if (!profile) throw new ApiError(404, 'Profile not found.');
    res.json(profile);
  }),
);

const updateSchema = z
  .object({
    organizationName: z.string().min(1),
    registrationNumber: z.string().min(1),
    contactPerson: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().min(1),
  })
  .partial();

profileRouter.patch(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const body = updateSchema.parse(req.body);
    const profile = await BidderProfile.findOneAndUpdate({ userId: req.userId }, body, { new: true });
    if (!profile) throw new ApiError(404, 'Profile not found.');
    res.json(profile);
  }),
);
