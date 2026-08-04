import type { RequestHandler } from "express";

import type { AccountType } from "../constants/auth.js";
import { findAccountById, type AuthAccount } from "../services/accountService.js";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes
} from "../services/twoFactorService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

const requireAuthenticatedAccount = async (
  accountType?: AccountType,
  accountId?: string
): Promise<AuthAccount> => {
  if (!accountType || !accountId) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  const account = await findAccountById(accountType, accountId);

  if (!account) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  return account;
};

export const twoFactorStatus: RequestHandler = asyncHandler(async (req, res) => {
  const account = await requireAuthenticatedAccount(req.authAccountType, req.authAccountId);
  const status = await getTwoFactorStatus(account);
  sendSuccess(res, 200, "Two-factor status loaded", { status });
});

export const beginSetup: RequestHandler = asyncHandler(async (req, res) => {
  const account = await requireAuthenticatedAccount(req.authAccountType, req.authAccountId);
  const setup = await beginTwoFactorSetup(account);
  sendSuccess(res, 200, "Two-factor setup started", { setup });
});

export const confirmSetup: RequestHandler = asyncHandler(async (req, res) => {
  const { totpCode } = req.body as { totpCode: string };
  const account = await requireAuthenticatedAccount(req.authAccountType, req.authAccountId);
  const result = await confirmTwoFactorSetup(account, totpCode);
  sendSuccess(res, 200, "Two-factor authentication enabled", result);
});

export const disableSetup: RequestHandler = asyncHandler(async (req, res) => {
  const { password, totpCode, recoveryCode } = req.body as {
    password: string;
    totpCode?: string;
    recoveryCode?: string;
  };
  const account = await requireAuthenticatedAccount(req.authAccountType, req.authAccountId);
  await disableTwoFactor(account, password, totpCode, recoveryCode);
  sendSuccess(res, 200, "Two-factor authentication disabled");
});

export const regenerateCodes: RequestHandler = asyncHandler(async (req, res) => {
  const { password, totpCode, recoveryCode } = req.body as {
    password: string;
    totpCode?: string;
    recoveryCode?: string;
  };
  const account = await requireAuthenticatedAccount(req.authAccountType, req.authAccountId);
  const recoveryCodes = await regenerateRecoveryCodes(account, password, totpCode, recoveryCode);
  sendSuccess(res, 200, "Recovery codes regenerated", { recoveryCodes });
});
