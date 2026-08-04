import { env } from "../config/env.js";
import type { AuthChallengePurpose } from "../constants/auth.js";
import AuthChallengeModel, { type AuthChallengeDocument } from "../models/AuthChallenge.js";
import { AppError } from "../utils/AppError.js";
import {
  generateOtp,
  generateSecureToken,
  hashEmailForAudit,
  hashSecret,
  timingSafeEqualHex
} from "../utils/authCrypto.js";
import { addDuration } from "../utils/duration.js";
import type { AuthAccount } from "./accountService.js";

const RESEND_COOLDOWN_MS = 60 * 1000;

interface TokenChallengeResult {
  token: string;
  expiresAt: Date;
}

interface OtpChallengeResult {
  otp: string;
  expiresAt: Date;
}

const activeChallengeFilter = (now: Date) => ({
  consumedAt: { $exists: false },
  revokedAt: { $exists: false },
  expiresAt: { $gt: now }
});

const invalidateActiveChallenges = async (
  account: AuthAccount,
  purpose: AuthChallengePurpose
): Promise<void> => {
  await AuthChallengeModel.updateMany(
    {
      accountId: account.id,
      accountType: account.type,
      purpose,
      consumedAt: { $exists: false },
      revokedAt: { $exists: false }
    },
    {
      revokedAt: new Date()
    }
  );
};

const assertResendAllowed = async (
  account: AuthAccount,
  purpose: AuthChallengePurpose
): Promise<void> => {
  const now = new Date();
  const existing = await AuthChallengeModel.findOne({
    accountId: account.id,
    accountType: account.type,
    purpose,
    ...activeChallengeFilter(now)
  });

  if (existing?.resendAvailableAt && existing.resendAvailableAt.getTime() > now.getTime()) {
    throw new AppError("Please wait before requesting another code", 429);
  }
};

export const createTokenChallenge = async (
  account: AuthAccount,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<TokenChallengeResult> => {
  await assertResendAllowed(account, purpose);
  await invalidateActiveChallenges(account, purpose);

  const now = new Date();
  const token = generateSecureToken();
  const expiresAt = addDuration(
    now,
    purpose === "EMAIL_VERIFICATION"
      ? env.EMAIL_VERIFICATION_EXPIRES_IN
      : env.PASSWORD_RESET_EXPIRES_IN
  );

  await new AuthChallengeModel({
    accountId: account.id,
    accountType: account.type,
    purpose,
    tokenHash: hashSecret(token, purpose),
    deliveryTargetHash: hashEmailForAudit(account.email),
    attempts: 0,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
    expiresAt
  }).save();

  return { token, expiresAt };
};

export const createOtpChallenge = async (
  account: AuthAccount,
  purpose: AuthChallengePurpose
): Promise<OtpChallengeResult> => {
  await assertResendAllowed(account, purpose);
  await invalidateActiveChallenges(account, purpose);

  const now = new Date();
  const otp = generateOtp();
  const expiresAt = addDuration(now, env.OTP_EXPIRES_IN);

  await new AuthChallengeModel({
    accountId: account.id,
    accountType: account.type,
    purpose,
    otpHash: hashSecret(otp, purpose),
    deliveryTargetHash: hashEmailForAudit(account.email),
    attempts: 0,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
    expiresAt
  }).save();

  return { otp, expiresAt };
};

export const consumeTokenChallenge = async (
  token: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<AuthChallengeDocument> => {
  const now = new Date();
  const challenge = await AuthChallengeModel.findOne({
    tokenHash: hashSecret(token, purpose),
    purpose,
    ...activeChallengeFilter(now)
  });

  if (!challenge) {
    throw new AppError("Invalid or expired token", 400);
  }

  const consumed = await AuthChallengeModel.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: { $exists: false },
      revokedAt: { $exists: false },
      expiresAt: { $gt: now }
    },
    {
      consumedAt: now
    },
    { new: true }
  );

  if (!consumed) {
    throw new AppError("Invalid or expired token", 400);
  }

  return consumed;
};

export const consumeOtpChallenge = async (
  account: AuthAccount,
  purpose: AuthChallengePurpose,
  otp: string
): Promise<AuthChallengeDocument> => {
  const now = new Date();
  const challenge = await AuthChallengeModel.findOne({
    accountId: account.id,
    accountType: account.type,
    purpose,
    ...activeChallengeFilter(now)
  });

  if (!challenge) {
    throw new AppError("Invalid or expired code", 400);
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new AppError("Invalid or expired code", 400);
  }

  const expectedHash = hashSecret(otp, purpose);
  const actualHash = challenge.otpHash;

  if (!actualHash || !timingSafeEqualHex(actualHash, expectedHash)) {
    const attempts = challenge.attempts + 1;
    await AuthChallengeModel.findByIdAndUpdate(challenge._id, {
      attempts,
      ...(attempts >= challenge.maxAttempts ? { revokedAt: now } : {})
    });
    throw new AppError("Invalid or expired code", 400);
  }

  const consumed = await AuthChallengeModel.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: { $exists: false },
      revokedAt: { $exists: false },
      expiresAt: { $gt: now }
    },
    {
      consumedAt: now
    },
    { new: true }
  );

  if (!consumed) {
    throw new AppError("Invalid or expired code", 400);
  }

  return consumed;
};
