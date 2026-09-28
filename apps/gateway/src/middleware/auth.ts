import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type Role = 'bidder' | 'officer';

export interface AuthedRequest extends Request {
  userId?: string;
  /** Set by requireOfficer from the verified JWT — never from the request body. */
  officer?: { id: string; email: string };
}

interface TokenPayload {
  sub: string;
  role?: Role;
  email?: string;
}

function readToken(req: Request): TokenPayload | null {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as TokenPayload;
    return typeof payload.sub === 'string' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Verifies the Bearer JWT and attaches req.userId. Every route that reads or
 * writes a bidder's own data depends on this — req.userId, never a
 * client-supplied id, is what ownership checks compare against.
 * Tokens issued before the role claim existed carry no role and are bidder
 * tokens; officer tokens are rejected here so an officer session can never
 * act as a bidder.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return res.status(401).json({ error: 'Authentication required.' });
  const payload = readToken(req);
  if (!payload || (payload.role ?? 'bidder') !== 'bidder') {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
  req.userId = payload.sub;
  next();
}

/**
 * Gates every /api/officer/* route: a verified JWT whose role claim is
 * 'officer'. Attaches req.officer (identity from the signed token) which
 * routes use for audit attribution.
 */
export function requireOfficer(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return res.status(401).json({ error: 'Officer authentication required.' });
  const payload = readToken(req);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  if (payload.role !== 'officer' || !payload.email) {
    return res.status(403).json({ error: 'Officer access required.' });
  }
  req.userId = payload.sub;
  req.officer = { id: payload.sub, email: payload.email };
  next();
}

export function signToken(userId: string, role: Role = 'bidder', email?: string): string {
  const claims: Record<string, string> = { sub: userId, role };
  if (email) claims.email = email;
  return jwt.sign(claims, env.jwtSecret, { algorithm: 'HS256', expiresIn: role === 'officer' ? '8h' : '7d' });
}
