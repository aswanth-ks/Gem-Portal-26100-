import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
  // eslint-disable-next-line no-console
  console.log(`[gateway] connected to MongoDB (db: ${env.mongoDbName})`);
}
