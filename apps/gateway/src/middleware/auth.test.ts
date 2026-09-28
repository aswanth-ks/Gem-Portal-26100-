import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { requireAuth, requireOfficer, signToken, type AuthedRequest } from './auth.js';

function run(mw: typeof requireAuth, authorization?: string) {
  const req = { headers: authorization ? { authorization } : {} } as AuthedRequest;
  let status = 200;
  const res = { status(code: number) { status = code; return this; }, json() { return this; } } as never;
  let passed = false;
  mw(req, res, () => { passed = true; });
  return { status: passed ? 200 : status, req };
}

const officer = signToken('507f1f77bcf86cd799439011', 'officer', 'officer@example.test');
const bidder = signToken('507f1f77bcf86cd799439012', 'bidder');
const legacyBidder = jwt.sign({ sub: '507f1f77bcf86cd799439013' }, env.jwtSecret, { expiresIn: '1h' });

test('requireOfficer: anonymous 401, bidder 403, officer 200 with identity from token', () => {
  assert.equal(run(requireOfficer).status, 401);
  assert.equal(run(requireOfficer, `Bearer ${bidder}`).status, 403);
  assert.equal(run(requireOfficer, `Bearer ${legacyBidder}`).status, 403);
  const ok = run(requireOfficer, `Bearer ${officer}`);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.req.officer, { id: '507f1f77bcf86cd799439011', email: 'officer@example.test' });
});

test('requireOfficer: garbage, tampered, expired and wrong-secret tokens are 401', () => {
  assert.equal(run(requireOfficer, 'Bearer not-a-jwt').status, 401);
  const [h, , s] = bidder.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'x', role: 'officer', email: 'evil@example.test' })).toString('base64url');
  assert.equal(run(requireOfficer, `Bearer ${h}.${forged}.${s}`).status, 401);
  const expired = jwt.sign({ sub: 'x', role: 'officer', email: 'a@b.c', exp: Math.floor(Date.now() / 1000) - 10 }, env.jwtSecret);
  assert.equal(run(requireOfficer, `Bearer ${expired}`).status, 401);
  const wrongSecret = jwt.sign({ sub: 'x', role: 'officer', email: 'a@b.c' }, 'not-the-secret');
  assert.equal(run(requireOfficer, `Bearer ${wrongSecret}`).status, 401);
  const noneAlg = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${forged}.`;
  assert.equal(run(requireOfficer, `Bearer ${noneAlg}`).status, 401);
});

test('requireAuth: bidder and legacy (no role) tokens pass, officer tokens are rejected', () => {
  assert.equal(run(requireAuth, `Bearer ${bidder}`).status, 200);
  assert.equal(run(requireAuth, `Bearer ${legacyBidder}`).status, 200);
  assert.equal(run(requireAuth, `Bearer ${officer}`).status, 401);
  assert.equal(run(requireAuth).status, 401);
});
