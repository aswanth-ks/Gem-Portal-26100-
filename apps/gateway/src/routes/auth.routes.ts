import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { BidderProfile } from '../models/BidderProfile.js';
import { signToken, requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncRoute, ApiError } from '../middleware/errorHandler.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  organizationName: z.string().min(1),
  registrationNumber: z.string().min(1),
  contactPerson: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
});

authRouter.post(
  '/register',
  asyncRoute(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) throw new ApiError(409, 'An account with this email already exists.');

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({ email: body.email, passwordHash, role: 'bidder' });
    await BidderProfile.create({
      userId: user._id,
      organizationName: body.organizationName,
      registrationNumber: body.registrationNumber,
      contactPerson: body.contactPerson,
      email: body.email,
      phone: body.phone,
      address: body.address,
    });

    const token = signToken(user._id.toString(), 'bidder');
    res.status(201).json({ token, user: { id: user._id, email: user.email } });
  }),
);

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) throw new ApiError(401, 'Invalid email or password.');
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    // Officer accounts sign in only via /officer-login.
    if (!ok || user.role !== 'bidder') throw new ApiError(401, 'Invalid email or password.');

    const token = signToken(user._id.toString(), 'bidder');
    res.json({ token, user: { id: user._id, email: user.email } });
  }),
);

// Officer login: same User collection, bcrypt and JWT signing as bidders;
// the token carries role 'officer' plus the officer's email, which
// requireOfficer exposes as req.officer for audit attribution.
authRouter.post(
  '/officer-login',
  asyncRoute(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    const ok = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !ok) throw new ApiError(401, 'Invalid email or password.');
    if (user.role !== 'officer') throw new ApiError(403, 'This account is not authorized for the officer workspace.');

    const token = signToken(user._id.toString(), 'officer', user.email);
    res.json({ token, officer: { id: user._id, email: user.email, name: user.name ?? null } });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncRoute(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId).select('email role');
    if (!user) throw new ApiError(404, 'Account not found.');
    const profile = await BidderProfile.findOne({ userId: req.userId });
    res.json({ user: { id: user._id, email: user.email, role: user.role }, profile });
  }),
);
