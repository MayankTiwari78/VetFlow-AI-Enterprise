import { env } from "../config/env.js";
import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole } from "../constants/rbac.js";
import AuthSessionModel, { type AuthSessionDocument } from "../models/AuthSession.js";
import { AppError } from "../utils/AppError.js";
import { generateTokenId, hashSecret } from "../utils/authCrypto.js";
import { addDuration } from "../utils/duration.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type RefreshTokenPayload
} from "./tokenService.js";
import type { AuthorizationContext } from "./organizationService.js";

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionTokenBundle {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  sessionId: string;
}

export interface SessionAccountInput {
  accountId: string;
  accountType: AccountType;
  email?: string;
  organizationId?: string;
  enterpriseRole?: EnterpriseRole;
}

export interface SafeSessionResponse {
  sessionId: string;
  displayName?: string;
  device?: string;
  ipAddress?: string;
  createdAt?: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  current: boolean;
}

const refreshHash = (token: string): string => hashSecret(token, "refresh-token");

const describeDevice = (userAgent?: string): string | undefined =>
  userAgent ? userAgent.slice(0, 180) : undefined;

export const createSessionTokenBundle = async (
  account: SessionAccountInput,
  metadata: RequestMetadata
): Promise<SessionTokenBundle> => {
  const now = new Date();
  const sessionId = generateTokenId();
  const refreshTokenId = generateTokenId();
  const tokenFamilyId = generateTokenId();
  const refreshTokenExpiresAt = addDuration(now, env.REFRESH_TOKEN_EXPIRES_IN);
  const refreshToken = signRefreshToken({
    accountId: account.accountId,
    accountType: account.accountType,
    email: account.email,
    sessionId,
    tokenId: refreshTokenId,
    tokenFamilyId,
    organizationId: account.organizationId,
    enterpriseRole: account.enterpriseRole
  });

  await new AuthSessionModel({
    sessionId,
    accountId: account.accountId,
    accountType: account.accountType,
    refreshTokenHash: refreshHash(refreshToken),
    refreshTokenId,
    tokenFamilyId,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: refreshTokenExpiresAt,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    device: describeDevice(metadata.userAgent),
    organizationId: account.organizationId
  }).save();

  return {
    accessToken: signAccessToken({ ...account, sessionId }),
    refreshToken,
    refreshTokenExpiresAt,
    sessionId
  };
};

export const rotateRefreshToken = async (
  rawRefreshToken: string,
  metadata: RequestMetadata,
  authorization?: AuthorizationContext
): Promise<{ payload: RefreshTokenPayload; bundle: SessionTokenBundle }> => {
  const payload = verifyRefreshToken(rawRefreshToken);
  const now = new Date();
  const nextRefreshTokenId = generateTokenId();
  const nextRefreshToken = signRefreshToken({
    accountId: payload.sub,
    accountType: payload.role,
    email: typeof payload.email === "string" ? payload.email : undefined,
    sessionId: payload.sessionId,
    tokenId: nextRefreshTokenId,
    tokenFamilyId: payload.tokenFamilyId,
    organizationId: authorization?.organizationId ?? payload.organizationId,
    enterpriseRole: authorization?.role ?? payload.enterpriseRole
  });

  const updatedSession = await AuthSessionModel.findOneAndUpdate(
    {
      sessionId: payload.sessionId,
      refreshTokenHash: refreshHash(rawRefreshToken),
      refreshTokenId: payload.tokenId,
      tokenFamilyId: payload.tokenFamilyId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: now }
    },
    {
      refreshTokenHash: refreshHash(nextRefreshToken),
      refreshTokenId: nextRefreshTokenId,
      lastActiveAt: now,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      device: describeDevice(metadata.userAgent),
      ...(authorization?.organizationId ? { organizationId: authorization.organizationId } : {})
    },
    { new: true }
  );

  if (!updatedSession) {
    await revokeFamilyForReuse(payload);
    throw new AppError("Invalid refresh token", 401);
  }

  return {
    payload,
    bundle: {
      accessToken: signAccessToken({
        accountId: payload.sub,
        accountType: payload.role,
        email: typeof payload.email === "string" ? payload.email : undefined,
        sessionId: payload.sessionId,
        organizationId:
          authorization?.organizationId ?? updatedSession.organizationId ?? payload.organizationId,
        enterpriseRole: authorization?.role ?? payload.enterpriseRole
      }),
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: updatedSession.expiresAt,
      sessionId: payload.sessionId
    }
  };
};

export const revokeSessionByRefreshToken = async (
  rawRefreshToken: string,
  reason: string
): Promise<void> => {
  const payload = verifyRefreshToken(rawRefreshToken);
  await AuthSessionModel.findOneAndUpdate(
    {
      sessionId: payload.sessionId,
      tokenFamilyId: payload.tokenFamilyId,
      revokedAt: { $exists: false }
    },
    {
      revokedAt: new Date(),
      revocationReason: reason
    }
  );
};

export const revokeAllSessionsForAccount = async (
  accountId: string,
  accountType: AccountType,
  reason: string
): Promise<void> => {
  await AuthSessionModel.updateMany(
    {
      accountId,
      accountType,
      revokedAt: { $exists: false }
    },
    {
      revokedAt: new Date(),
      revocationReason: reason
    }
  );
};

const safeSession = (
  session: AuthSessionDocument,
  currentSessionId?: string
): SafeSessionResponse => ({
  sessionId: session.sessionId,
  displayName: session.displayName,
  device: session.device,
  ipAddress: session.ipAddress,
  createdAt: session.createdAt,
  lastActiveAt: session.lastActiveAt,
  expiresAt: session.expiresAt,
  current: session.sessionId === currentSessionId
});

export const listActiveSessionsForAccount = async (
  accountId: string,
  accountType: AccountType,
  currentSessionId?: string
): Promise<SafeSessionResponse[]> => {
  const sessions = await AuthSessionModel.find({
    accountId,
    accountType,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  }).sort({ lastActiveAt: -1 });

  return sessions.map((session) => safeSession(session, currentSessionId));
};

export const renameOwnSession = async (
  accountId: string,
  accountType: AccountType,
  sessionId: string,
  displayName: string
): Promise<void> => {
  const updated = await AuthSessionModel.findOneAndUpdate(
    {
      accountId,
      accountType,
      sessionId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    },
    { displayName }
  );

  if (!updated) {
    throw new AppError("Session not found", 404);
  }
};

export const revokeOwnSessionById = async (
  accountId: string,
  accountType: AccountType,
  sessionId: string,
  reason: string
): Promise<void> => {
  const updated = await AuthSessionModel.findOneAndUpdate(
    {
      accountId,
      accountType,
      sessionId,
      revokedAt: { $exists: false }
    },
    {
      revokedAt: new Date(),
      revocationReason: reason
    }
  );

  if (!updated) {
    throw new AppError("Session not found", 404);
  }
};

export const revokeOtherSessionsForAccount = async (
  accountId: string,
  accountType: AccountType,
  currentSessionId: string,
  reason: string
): Promise<number> => {
  const result = await AuthSessionModel.updateMany(
    {
      accountId,
      accountType,
      sessionId: { $ne: currentSessionId },
      revokedAt: { $exists: false }
    },
    {
      revokedAt: new Date(),
      revocationReason: reason
    }
  );

  return result.modifiedCount;
};

export const pruneExpiredOrRevokedSessions = async (): Promise<number> => {
  const result = await AuthSessionModel.updateMany(
    {
      $or: [{ expiresAt: { $gt: new Date(0), $lt: new Date() } }, { revokedAt: { $exists: true } }]
    },
    { revocationReason: "expired-or-revoked-pruned" }
  );

  return result.modifiedCount;
};

export const revokeFamilyForReuse = async (payload: RefreshTokenPayload): Promise<void> => {
  await AuthSessionModel.updateMany(
    {
      tokenFamilyId: payload.tokenFamilyId,
      revokedAt: { $exists: false }
    },
    {
      revokedAt: new Date(),
      revocationReason: "refresh-token-reuse-detected"
    }
  );
};

export const assertSessionIsUsable = (session: AuthSessionDocument): void => {
  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Invalid refresh token", 401);
  }
};
