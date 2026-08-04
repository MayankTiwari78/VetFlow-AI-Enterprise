import type { Request, RequestHandler, Response } from "express";

import type { AccountType } from "../constants/auth.js";
import { findAccountById } from "../services/accountService.js";
import {
  forgotPassword,
  loginAccount,
  loginAdminAccount,
  loginDoctorAccount,
  loginPatient,
  logoutAllSessions,
  logoutCurrentSession,
  refreshAccessToken,
  registerPatient,
  requestOtp,
  resendVerification,
  resetPassword,
  type LoginResult,
  verifyTwoFactorLogin,
  verifyEmailToken,
  verifyOtp
} from "../services/authService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  clearRefreshTokenCookie,
  getRefreshTokenCookie,
  setRefreshTokenCookie
} from "../utils/cookies.js";
import { sendSuccess } from "../utils/response.js";

const requestMetadata = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent")
});

const sendLoginResponse = (res: Response, result: LoginResult) => {
  if (result.requiresTwoFactor) {
    return sendSuccess(res, 202, "Two-factor verification required", {
      requiresTwoFactor: true,
      twoFactorToken: result.twoFactorToken,
      expiresAt: result.expiresAt,
      account: result.account
    });
  }

  setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  return sendSuccess(
    res,
    200,
    "Login successful",
    {
      accessToken: result.accessToken,
      token: result.token,
      account: result.account,
      sessionId: result.sessionId
    },
    { token: result.token }
  );
};

export const registerUser: RequestHandler = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };
  const result = await registerPatient(name, email, password);
  const data =
    result.verificationExpiresAt === undefined
      ? { account: result.account }
      : { account: result.account, verificationExpiresAt: result.verificationExpiresAt };
  sendSuccess(
    res,
    201,
    result.account.emailVerified
      ? "Registration successful."
      : "Registration successful. Please verify your email.",
    data
  );
});

export const loginUser: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await loginPatient(email, password, requestMetadata(req));
  sendLoginResponse(res, result);
});

export const loginDoctor: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await loginDoctorAccount(email, password, requestMetadata(req));
  sendLoginResponse(res, result);
});

export const loginAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await loginAdminAccount(email, password, requestMetadata(req));
  sendLoginResponse(res, result);
});

export const unifiedLogin: RequestHandler = asyncHandler(async (req, res) => {
  const { email, password, accountType } = req.body as {
    email: string;
    password: string;
    accountType: AccountType;
  };
  const result = await loginAccount(accountType, email, password, requestMetadata(req));
  sendLoginResponse(res, result);
});

export const verifyTwoFactorLoginRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { twoFactorToken, totpCode, recoveryCode } = req.body as {
    twoFactorToken: string;
    totpCode?: string;
    recoveryCode?: string;
  };
  const result = await verifyTwoFactorLogin(
    twoFactorToken,
    totpCode,
    recoveryCode,
    requestMetadata(req)
  );
  sendLoginResponse(res, result);
});

export const refreshToken: RequestHandler = asyncHandler(async (req, res) => {
  const refreshCookie = getRefreshTokenCookie(req);

  if (!refreshCookie) {
    throw new AppError("Invalid refresh token", 401);
  }

  const result = await refreshAccessToken(refreshCookie, requestMetadata(req));
  setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  sendSuccess(
    res,
    200,
    "Token refreshed",
    {
      accessToken: result.accessToken,
      token: result.token,
      account: result.account,
      sessionId: result.sessionId
    },
    { token: result.token }
  );
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  await logoutCurrentSession(getRefreshTokenCookie(req));
  clearRefreshTokenCookie(res);
  sendSuccess(res, 200, "Logout successful");
});

export const logoutAll: RequestHandler = asyncHandler(async (req, res) => {
  const accountType = req.authAccountType;
  const accountId = req.authAccountId;

  if (!accountType || !accountId) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  const account = await findAccountById(accountType, accountId);

  if (!account) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  await logoutAllSessions(account);
  clearRefreshTokenCookie(res);
  sendSuccess(res, 200, "Logged out from all sessions");
});

export const verifyEmail: RequestHandler = asyncHandler(async (req, res) => {
  const { token } = req.body as { token: string };
  const account = await verifyEmailToken(token);
  sendSuccess(res, 200, "Email verified", { account });
});

export const verifyEmailLink: RequestHandler = asyncHandler(async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!token) {
    throw new AppError("Verification token is required", 400);
  }

  const account = await verifyEmailToken(token);
  sendSuccess(res, 200, "Email verified", { account });
});

export const resendVerificationEmail: RequestHandler = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };
  const message = await resendVerification(email);
  sendSuccess(res, 200, message);
});

export const forgotPasswordRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };
  const message = await forgotPassword(email);
  sendSuccess(res, 200, message);
});

export const resetPasswordRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { token, password } = req.body as { token: string; password: string };
  const account = await resetPassword(token, password);
  sendSuccess(res, 200, "Password reset successful", { account });
});

export const requestOtpChallenge: RequestHandler = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body as {
    email: string;
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_VERIFICATION";
  };
  const message = await requestOtp(email, purpose);
  sendSuccess(res, 200, message);
});

export const verifyOtpChallenge: RequestHandler = asyncHandler(async (req, res) => {
  const { email, purpose, otp } = req.body as {
    email: string;
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_VERIFICATION";
    otp: string;
  };
  const account = await verifyOtp(email, purpose, otp);
  sendSuccess(res, 200, "Verification code accepted", { account });
});
