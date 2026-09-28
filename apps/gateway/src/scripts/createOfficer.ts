// Creates (or resets the password of) an officer login. Officer accounts are
// never self-registered through the public API — this script is the only
// creation path.
//
// Credentials come from the environment, never from source:
//   OFFICER_EMAIL=... OFFICER_PASSWORD=... [OFFICER_NAME=...] \
//     npm run create-officer --workspace=apps/gateway

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

async function main() {
  const email = process.env.OFFICER_EMAIL?.trim().toLowerCase();
  const password = process.env.OFFICER_PASSWORD;
  const name = process.env.OFFICER_NAME?.trim();
  if (!email || !password) throw new Error('Set OFFICER_EMAIL and OFFICER_PASSWORD.');
  if (password.length < 12) throw new Error('OFFICER_PASSWORD must be at least 12 characters.');

  await connectDb();
  const existing = await User.findOne({ email });
  if (existing && existing.role !== 'officer') throw new Error(`${email} is an existing bidder account; refusing to convert it.`);

  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    existing.passwordHash = passwordHash;
    if (name) existing.name = name;
    await existing.save();
    console.log(`[create-officer] updated officer ${email}`);
  } else {
    await User.create({ email, passwordHash, role: 'officer', name });
    console.log(`[create-officer] created officer ${email}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[create-officer] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
