import mongoose, { type HydratedDocument, type Model } from "mongoose";

import { ACCOUNT_TYPES, type AccountType } from "../constants/auth.js";

export interface AuthSession {
  sessionId: string;
  accountId: string;
  accountType: AccountType;
  refreshTokenHash: string;
  refreshTokenId: string;
  tokenFamilyId: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revocationReason?: string;
  displayName?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
}

export type AuthSessionDocument = HydratedDocument<AuthSession>;

const authSessionSchema = new mongoose.Schema<AuthSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    refreshTokenId: { type: String, required: true, index: true },
    tokenFamilyId: { type: String, required: true, index: true },
    lastActiveAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, index: true },
    revocationReason: { type: String },
    displayName: { type: String, trim: true, maxlength: 120 },
    organizationId: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    device: { type: String }
  },
  { timestamps: true }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ accountId: 1, accountType: 1, revokedAt: 1 });
authSessionSchema.index({ tokenFamilyId: 1, revokedAt: 1 });

const AuthSessionModel =
  (mongoose.models.auth_session as Model<AuthSession> | undefined) ??
  mongoose.model<AuthSession>("auth_session", authSessionSchema);

export default AuthSessionModel;
