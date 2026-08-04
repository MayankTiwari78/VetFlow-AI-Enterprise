import mongoose, { type HydratedDocument, type Model } from "mongoose";

import {
  ACCOUNT_TYPES,
  AUTH_CHALLENGE_PURPOSES,
  type AccountType,
  type AuthChallengePurpose
} from "../constants/auth.js";

export interface AuthChallenge {
  accountId: string;
  accountType: AccountType;
  purpose: AuthChallengePurpose;
  tokenHash?: string;
  otpHash?: string;
  deliveryTargetHash: string;
  attempts: number;
  maxAttempts: number;
  resendAvailableAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AuthChallengeDocument = HydratedDocument<AuthChallenge>;

const authChallengeSchema = new mongoose.Schema<AuthChallenge>(
  {
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    purpose: { type: String, enum: AUTH_CHALLENGE_PURPOSES, required: true, index: true },
    tokenHash: { type: String, index: true },
    otpHash: { type: String },
    deliveryTargetHash: { type: String, required: true, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, required: true },
    resendAvailableAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, index: true },
    revokedAt: { type: Date, index: true }
  },
  { timestamps: true }
);

authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authChallengeSchema.index({
  accountId: 1,
  accountType: 1,
  purpose: 1,
  consumedAt: 1,
  revokedAt: 1
});
authChallengeSchema.index({ tokenHash: 1, purpose: 1 });

const AuthChallengeModel =
  (mongoose.models.auth_challenge as Model<AuthChallenge> | undefined) ??
  mongoose.model<AuthChallenge>("auth_challenge", authChallengeSchema);

export default AuthChallengeModel;
