import { Schema, model } from 'mongoose';

const bidderProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organizationName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    verificationStatus: { type: String, enum: ['pending', 'verified'], default: 'pending' },
  },
  { timestamps: true },
);

export const BidderProfile = model('BidderProfile', bidderProfileSchema);
