import bcrypt from "bcrypt";

import { env } from "../config/env.js";
import {
  type AccountStatus,
  type AccountType,
  GENERIC_AUTH_ERROR,
  GENERIC_RECOVERY_RESPONSE
} from "../constants/auth.js";
import UserModel from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { normalizeEmail } from "../utils/authCrypto.js";
import {
  assertAccessAllowed,
  assertAccountCanAuthenticate,
  comparePasswordForLogin,
  ensureEmailAvailableForPatientRegistration,
  findAccountByEmail,
  findAccountById,
  genericInvalidCredentials,
  markEmailVerified,
  recordFailedLogin,
  recordSuccessfulLogin,
  updatePasswordForAccount,
  type AuthAccount
} from "./accountService.js";
import {
  consumeOtpChallenge,
  consumeTokenChallenge,
  createOtpChallenge,
  createTokenChallenge
} from "./authChallengeService.js";
import {
  createSessionTokenBundle,
  revokeAllSessionsForAccount,
  revokeSessionByRefreshToken,
  rotateRefreshToken,
  type RequestMetadata
} from "./authSessionService.js";
import { sendOtpEmail, sendPasswordResetEmail, sendVerificationEmail } from "./emailService.js";
import { resolveAuthorizationContext } from "./organizationService.js";
import { verifyRefreshToken } from "./tokenService.js";
import {
  createTwoFactorLoginChallenge,
  getTwoFactorStatus,
  verifyTwoFactorLoginChallenge
} from "./twoFactorService.js";
import { writeAuditLog } from "./auditService.js";

export interface SafeAccountResponse {
  id: string;
  role: AccountType;
  enterpriseRole?: string;
  organizationId?: string;
  permissions?: string[];
  name?: string;
  email: string;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  lastLoginAt?: Date;
}

export interface AuthResult {
  requiresTwoFactor?: false;
  token: string;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  sessionId: string;
  account: SafeAccountResponse;
}

export interface TwoFactorRequiredResult {
  requiresTwoFactor: true;
  twoFactorToken: string;
  expiresAt: Date;
  account: SafeAccountResponse;
}

export type LoginResult = AuthResult | TwoFactorRequiredResult;

export interface RegistrationResult {
  account: SafeAccountResponse;
  verificationExpiresAt?: Date;
}

const safeAccount = (
  account: AuthAccount,
  authorization?: Awaited<ReturnType<typeof resolveAuthorizationContext>>
): SafeAccountResponse => ({
  id: account.id,
  role: account.type,
  enterpriseRole: authorization?.role ?? account.role,
  organizationId: authorization?.organizationId ?? account.organizationId,
  permissions: authorization?.permissions,
  name: account.name,
  email: account.email,
  emailVerified: account.emailVerified,
  accountStatus: account.accountStatus,
  lastLoginAt: account.lastLoginAt
});

const isMongoDuplicateError = (error: unknown): boolean =>
  Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );

const issueSession = async (
  account: AuthAccount,
  metadata: RequestMetadata
): Promise<AuthResult> => {
  const authorization = await resolveAuthorizationContext(account);
  const bundle = await createSessionTokenBundle(
    {
      accountId: account.id,
      accountType: account.type,
      email: account.email,
      organizationId: authorization.organizationId,
      enterpriseRole: authorization.role
    },
    metadata
  );

  return {
    requiresTwoFactor: false,
    token: bundle.accessToken,
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
    refreshTokenExpiresAt: bundle.refreshTokenExpiresAt,
    sessionId: bundle.sessionId,
    account: safeAccount(account, authorization)
  };
};

const verifyAdminPassword = (email: string, password: string): boolean =>
  normalizeEmail(email) === normalizeEmail(env.ADMIN_EMAIL) && password === env.ADMIN_PASSWORD;

const shouldAutoVerifyDevelopmentEmail = (): boolean =>
  env.NODE_ENV !== "production" && env.DEVELOPMENT_AUTO_VERIFY_EMAIL === "true";

export const registerPatient = async (
  name: string,
  email: string,
  password: string
): Promise<RegistrationResult> => {
  const normalizedEmail = normalizeEmail(email);
  await ensureEmailAvailableForPatientRegistration(normalizedEmail);

  const hashedPassword = await bcrypt.hash(password, 12);
  const autoVerifyEmail = shouldAutoVerifyDevelopmentEmail();
  const verifiedAt = autoVerifyEmail ? new Date() : undefined;

  try {
    const user = await new UserModel({
      name,
      email: normalizedEmail,
      normalizedEmail,
      password: hashedPassword,
      emailVerified: autoVerifyEmail,
      emailVerifiedAt: verifiedAt,
      accountStatus: autoVerifyEmail ? "ACTIVE" : "PENDING_VERIFICATION",
      failedLoginAttempts: 0,
      authenticationProvider: "LOCAL",
      role: "PATIENT"
    }).save();

    const account = await findAccountById("patient", String(user._id));

    if (!account) {
      throw new AppError("Registration failed", 500);
    }

    if (autoVerifyEmail) {
      await writeAuditLog({
        eventType: "auth.registration",
        actor: { accountId: account.id, accountType: account.type, role: account.role },
        target: { type: "account", id: account.id },
        metadata: { publicRegistration: true, developmentAutoVerified: true }
      });

      return {
        account: safeAccount(account)
      };
    }

    const challenge = await createTokenChallenge(account, "EMAIL_VERIFICATION");

    try {
      await sendVerificationEmail(account.email, challenge.token);
    } catch {
      throw new AppError(
        "Account created but verification email could not be sent. Please request a new verification email.",
        502
      );
    }

    await writeAuditLog({
      eventType: "auth.registration",
      actor: { accountId: account.id, accountType: account.type, role: account.role },
      target: { type: "account", id: account.id },
      metadata: { publicRegistration: true, developmentAutoVerified: false }
    });

    return {
      account: safeAccount(account),
      verificationExpiresAt: challenge.expiresAt
    };
  } catch (error) {
    if (isMongoDuplicateError(error)) {
      throw new AppError("email already exists", 409);
    }

    throw error;
  }
};

export const loginAccount = async (
  accountType: AccountType,
  email: string,
  password: string,
  metadata: RequestMetadata
): Promise<LoginResult> => {
  const normalizedEmail = normalizeEmail(email);
  const account = await findAccountByEmail(accountType, normalizedEmail);

  if (!account) {
    await comparePasswordForLogin(null, password);
    throw genericInvalidCredentials();
  }

  if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
    throw new AppError("Account temporarily locked. Please try again later.", 423);
  }

  const passwordMatches =
    account.type === "admin"
      ? verifyAdminPassword(normalizedEmail, password)
      : await comparePasswordForLogin(account, password);

  if (!passwordMatches) {
    await recordFailedLogin(account);
    throw new AppError(GENERIC_AUTH_ERROR, 401);
  }

  assertAccountCanAuthenticate(account);
  await recordSuccessfulLogin(account);

  const refreshedAccount = (await findAccountById(account.type, account.id)) ?? account;
  const twoFactorStatus = await getTwoFactorStatus(refreshedAccount);

  if (twoFactorStatus.enabled) {
    const challenge = await createTwoFactorLoginChallenge(refreshedAccount);
    const authorization = await resolveAuthorizationContext(refreshedAccount);

    return {
      requiresTwoFactor: true,
      twoFactorToken: challenge.twoFactorToken,
      expiresAt: challenge.expiresAt,
      account: safeAccount(refreshedAccount, authorization)
    };
  }

  const result = await issueSession(refreshedAccount, metadata);
  await writeAuditLog({
    eventType: "auth.login.success",
    actor: {
      accountId: refreshedAccount.id,
      accountType: refreshedAccount.type,
      role: refreshedAccount.role
    },
    organizationId: result.account.organizationId,
    target: { type: "account", id: refreshedAccount.id },
    metadata: { twoFactor: false }
  });

  return result;
};

export const loginPatient = (
  email: string,
  password: string,
  metadata: RequestMetadata
): Promise<LoginResult> => loginAccount("patient", email, password, metadata);

export const loginDoctorAccount = (
  email: string,
  password: string,
  metadata: RequestMetadata
): Promise<LoginResult> => loginAccount("doctor", email, password, metadata);

export const loginAdminAccount = (
  email: string,
  password: string,
  metadata: RequestMetadata
): Promise<LoginResult> => loginAccount("admin", email, password, metadata);

export const verifyTwoFactorLogin = async (
  twoFactorToken: string,
  totpCode: string | undefined,
  recoveryCode: string | undefined,
  metadata: RequestMetadata
): Promise<AuthResult> => {
  const account = await verifyTwoFactorLoginChallenge(
    twoFactorToken,
    { totpCode, recoveryCode },
    metadata
  );
  const refreshedAccount = (await findAccountById(account.type, account.id)) ?? account;

  return issueSession(refreshedAccount, metadata);
};

export const refreshAccessToken = async (
  refreshToken: string,
  metadata: RequestMetadata
): Promise<AuthResult> => {
  const payload = verifyRefreshToken(refreshToken);
  const account = await findAccountById(payload.role, payload.sub);

  if (!account) {
    throw new AppError("Invalid refresh token", 401);
  }

  assertAccessAllowed(account);
  const authorization = await resolveAuthorizationContext(account);

  const rotated = await rotateRefreshToken(refreshToken, metadata, authorization);

  return {
    requiresTwoFactor: false,
    token: rotated.bundle.accessToken,
    accessToken: rotated.bundle.accessToken,
    refreshToken: rotated.bundle.refreshToken,
    refreshTokenExpiresAt: rotated.bundle.refreshTokenExpiresAt,
    sessionId: rotated.bundle.sessionId,
    account: safeAccount(account, authorization)
  };
};

export const logoutCurrentSession = async (refreshToken: string | undefined): Promise<void> => {
  if (!refreshToken) {
    return;
  }

  await revokeSessionByRefreshToken(refreshToken, "logout");
};

export const logoutAllSessions = async (account: AuthAccount): Promise<void> => {
  await revokeAllSessionsForAccount(account.id, account.type, "logout-all");
};

export const verifyEmailToken = async (token: string): Promise<SafeAccountResponse> => {
  const challenge = await consumeTokenChallenge(token, "EMAIL_VERIFICATION");
  const account = await findAccountById(challenge.accountType, challenge.accountId);

  if (!account) {
    throw new AppError("Invalid or expired token", 400);
  }

  await markEmailVerified(account);
  const updatedAccount = (await findAccountById(account.type, account.id)) ?? {
    ...account,
    emailVerified: true,
    accountStatus: "ACTIVE" as const
  };

  return safeAccount(updatedAccount);
};

export const resendVerification = async (email: string): Promise<string> => {
  const account = await findAccountByEmail("patient", email);

  if (!account || account.emailVerified) {
    return GENERIC_RECOVERY_RESPONSE;
  }

  const challenge = await createTokenChallenge(account, "EMAIL_VERIFICATION");

  try {
    await sendVerificationEmail(account.email, challenge.token);
  } catch {
    throw new AppError("Verification email could not be sent. Please try again later.", 502);
  }

  return "Verification instructions sent";
};

export const forgotPassword = async (email: string): Promise<string> => {
  const normalizedEmail = normalizeEmail(email);
  const account =
    (await findAccountByEmail("patient", normalizedEmail)) ??
    (await findAccountByEmail("doctor", normalizedEmail));

  if (!account || account.type === "admin") {
    return GENERIC_RECOVERY_RESPONSE;
  }

  const challenge = await createTokenChallenge(account, "PASSWORD_RESET");

  try {
    await sendPasswordResetEmail(account.email, challenge.token);
  } catch {
    throw new AppError("Password reset email could not be sent. Please try again later.", 502);
  }

  return GENERIC_RECOVERY_RESPONSE;
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<SafeAccountResponse> => {
  const challenge = await consumeTokenChallenge(token, "PASSWORD_RESET");
  const account = await findAccountById(challenge.accountType, challenge.accountId);

  if (!account || !account.passwordHash) {
    throw new AppError("Invalid or expired token", 400);
  }

  if (await bcrypt.compare(newPassword, account.passwordHash)) {
    throw new AppError("New password must be different from the current password", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updatePasswordForAccount(account, passwordHash);
  await revokeAllSessionsForAccount(account.id, account.type, "password-reset");

  const updatedAccount = (await findAccountById(account.type, account.id)) ?? account;
  return safeAccount(updatedAccount);
};

export const requestOtp = async (
  email: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_VERIFICATION"
): Promise<string> => {
  const normalizedEmail = normalizeEmail(email);
  const account =
    (await findAccountByEmail("patient", normalizedEmail)) ??
    (await findAccountByEmail("doctor", normalizedEmail));

  if (!account || (purpose === "EMAIL_VERIFICATION" && account.emailVerified)) {
    return GENERIC_RECOVERY_RESPONSE;
  }

  const challenge = await createOtpChallenge(account, purpose);

  try {
    await sendOtpEmail(account.email, purpose, challenge.otp);
  } catch {
    throw new AppError("Verification code could not be sent. Please try again later.", 502);
  }

  return "Verification code sent";
};

export const verifyOtp = async (
  email: string,
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_VERIFICATION",
  otp: string
): Promise<SafeAccountResponse> => {
  const normalizedEmail = normalizeEmail(email);
  const account =
    (await findAccountByEmail("patient", normalizedEmail)) ??
    (await findAccountByEmail("doctor", normalizedEmail));

  if (!account) {
    throw new AppError("Invalid or expired code", 400);
  }

  await consumeOtpChallenge(account, purpose, otp);

  if (purpose === "EMAIL_VERIFICATION") {
    await markEmailVerified(account);
  }

  const updatedAccount = (await findAccountById(account.type, account.id)) ?? account;
  return safeAccount(updatedAccount);
};
