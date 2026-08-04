import mongoose, { type HydratedDocument, type Model } from "mongoose";

import { ACCOUNT_TYPES, type AccountType } from "../constants/auth.js";

export interface RecoveryCodeRecord {
  codeHash: string;
  createdAt: Date;
  consumedAt?: Date;
}

export interface AuthSecurity {
  accountId: string;
  accountType: AccountType;
  twoFactorEnabled: boolean;
  twoFactorEnabledAt?: Date;
  encryptedTotpSecret?: string;
  pendingEncryptedTotpSecret?: string;
  pendingSetupExpiresAt?: Date;
  pendingSetupAttempts: number;
  lastTotpStep?: number;
  recoveryCodes: RecoveryCodeRecord[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type AuthSecurityDocument = HydratedDocument<AuthSecurity>;

const recoveryCodeSchema = new mongoose.Schema<RecoveryCodeRecord>(
  {
    codeHash: { type: String, required: true },
    createdAt: { type: Date, required: true },
    consumedAt: { type: Date }
  },
  { _id: false }
);

const authSecuritySchema = new mongoose.Schema<AuthSecurity>(
  {
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    twoFactorEnabled: { type: Boolean, default: false, index: true },
    twoFactorEnabledAt: { type: Date },
    encryptedTotpSecret: { type: String },
    pendingEncryptedTotpSecret: { type: String },
    pendingSetupExpiresAt: { type: Date, index: true },
    pendingSetupAttempts: { type: Number, default: 0 },
    lastTotpStep: { type: Number },
    recoveryCodes: { type: [recoveryCodeSchema], default: [] }
  },
  { timestamps: true }
);

authSecuritySchema.index({ accountId: 1, accountType: 1 }, { unique: true });

const AuthSecurityModel =
  (mongoose.models.auth_security as Model<AuthSecurity> | undefined) ??
  mongoose.model<AuthSecurity>("auth_security", authSecuritySchema);

export default AuthSecurityModel;
