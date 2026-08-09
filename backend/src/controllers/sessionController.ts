import type { RequestHandler } from "express";

import {
  listActiveSessionsForAccount,
  pruneExpiredOrRevokedSessions,
  renameOwnSession,
  revokeAllSessionsForAccount,
  revokeOtherSessionsForAccount,
  revokeOwnSessionById
} from "../services/authSessionService.js";
import { writeAuditLog } from "../services/auditService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearRefreshTokenCookie } from "../utils/cookies.js";
import { sendSuccess } from "../utils/response.js";

const requireAccountContext = (req: Parameters<RequestHandler>[0]) => {
  if (!req.authAccountId || !req.authAccountType) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  return {
    accountId: req.authAccountId,
    accountType: req.authAccountType,
    organizationId: req.authOrganizationId,
    role: req.authRole
  };
};

const auditSessionEvent = async (
  req: Parameters<RequestHandler>[0],
  eventType: "session.revoked" | "auth.logout_all",
  sessionId?: string
): Promise<void> => {
  const account = requireAccountContext(req);
  await writeAuditLog({
    eventType,
    actor: {
      accountId: account.accountId,
      accountType: account.accountType,
      role: account.role
    },
    organizationId: account.organizationId,
    target: sessionId
      ? { type: "session", id: sessionId }
      : { type: "account", id: account.accountId }
  });
};

export const listSessions: RequestHandler = asyncHandler(async (req, res) => {
  const account = requireAccountContext(req);
  const sessions = await listActiveSessionsForAccount(
    account.accountId,
    account.accountType,
    req.authSessionId
  );
  sendSuccess(res, 200, "Sessions loaded", { sessions });
});

export const renameSession: RequestHandler = asyncHandler(async (req, res) => {
  const account = requireAccountContext(req);
  const { sessionId } = req.params as { sessionId: string };
  const { displayName } = req.body as { displayName: string };
  await renameOwnSession(account.accountId, account.accountType, sessionId, displayName);
  sendSuccess(res, 200, "Session renamed");
});

export const revokeSession: RequestHandler = asyncHandler(async (req, res) => {
  const account = requireAccountContext(req);
  const { sessionId } = req.params as { sessionId: string };
  await revokeOwnSessionById(account.accountId, account.accountType, sessionId, "user-revoked");
  await auditSessionEvent(req, "session.revoked", sessionId);

  if (req.authSessionId === sessionId) {
    clearRefreshTokenCookie(res, req.authAccountType);
  }

  sendSuccess(res, 200, "Session revoked");
});

export const revokeOtherSessions: RequestHandler = asyncHandler(async (req, res) => {
  const account = requireAccountContext(req);

  if (!req.authSessionId) {
    throw new AppError("Current session is required for this action", 400);
  }

  const revokedCount = await revokeOtherSessionsForAccount(
    account.accountId,
    account.accountType,
    req.authSessionId,
    "user-revoked-other-sessions"
  );
  await auditSessionEvent(req, "session.revoked");
  sendSuccess(res, 200, "Other sessions revoked", { revokedCount });
});

export const revokeAllSessions: RequestHandler = asyncHandler(async (req, res) => {
  const account = requireAccountContext(req);
  await revokeAllSessionsForAccount(account.accountId, account.accountType, "user-revoked-all");
  await auditSessionEvent(req, "auth.logout_all");
  clearRefreshTokenCookie(res, req.authAccountType);
  sendSuccess(res, 200, "All sessions revoked");
});

export const pruneSessions: RequestHandler = asyncHandler(async (_req, res) => {
  const updatedCount = await pruneExpiredOrRevokedSessions();
  sendSuccess(res, 200, "Expired or revoked sessions marked", { updatedCount });
});