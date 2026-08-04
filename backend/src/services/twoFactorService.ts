import { env } from "../config/env.js";
import QRCode from "qrcode";
import AuthChallengeModel from "../models/AuthChallenge.js";
import AuthSecurityModel, {
  type AuthSecurityDocument,
  type RecoveryCodeRecord
} from "../models/AuthSecurity.js";
import { AppError } from "../utils/AppError.js";
import { hashEmailForAudit, hashSecret, timingSafeEqualHex } from "../utils/authCrypto.js";
import { addDuration } from "../utils/duration.js";
import { decryptString, encryptString } from "../utils/encryption.js";
import {
  createOtpAuthUri,
  generateRecoveryCode,
  generateTotpSecret,
  verifyTotp
} from "../utils/totp.js";
import {
  assertAccessAllowed,
  comparePasswordForLogin,
  findAccountById,
  type AuthAccount
} from "./accountService.js";
import { revokeAllSessionsForAccount, type RequestMetadata } from "./authSessionService.js";
import { writeAuditLog, type AuditInput } from "./auditService.js";
import { signTwoFactorChallengeToken, verifyTwoFactorChallengeToken } from "./tokenService.js";

export interface TwoFactorSetupResponse {
  otpauthUri: string;
  qrCodeDataUrl: string;
  expiresAt: Date;
}

export interface TwoFactorConfirmResponse {
  enabledAt: Date;
  recoveryCodes: string[];
}

export interface TwoFactorChallengeResponse {
  twoFactorToken: string;
  expiresAt: Date;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  enabledAt?: Date;
  recoveryCodesRemaining: number;
}

const auditActor = (account: AuthAccount) => ({
  accountId: account.id,
  accountType: account.type,
  role: account.role
});

const audit = async (
  account: AuthAccount,
  eventType: AuditInput["eventType"],
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  await writeAuditLog({
    eventType,
    actor: auditActor(account),
    organizationId: account.organizationId,
    target: { type: "account", id: account.id },
    metadata
  });
};

const createQrCodeDataUrl = async (otpauthUri: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256
    });
  } catch {
    throw new AppError("Unable to generate two-factor QR code", 500);
  }
};

const getOrCreateSecurity = async (account: AuthAccount): Promise<AuthSecurityDocument> => {
  const existing = await AuthSecurityModel.findOne({
    accountId: account.id,
    accountType: account.type
  });

  if (existing) {
    return existing;
  }

  return new AuthSecurityModel({
    accountId: account.id,
    accountType: account.type,
    twoFactorEnabled: false,
    pendingSetupAttempts: 0,
    recoveryCodes: []
  }).save();
};

const recoveryCodeHash = (code: string): string =>
  hashSecret(code.replace(/\s+/g, "").toUpperCase(), "two-factor-recovery-code");

const createRecoveryCodes = (): { rawCodes: string[]; storedCodes: RecoveryCodeRecord[] } => {
  const rawCodes = Array.from({ length: env.RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
  const now = new Date();
  const storedCodes = rawCodes.map((code) => ({
    codeHash: recoveryCodeHash(code),
    createdAt: now
  }));

  return { rawCodes, storedCodes };
};

const validateTotpForSecurity = async (
  security: AuthSecurityDocument,
  code: string
): Promise<{ valid: boolean; step?: number }> => {
  if (!security.encryptedTotpSecret) {
    return { valid: false };
  }

  const secret = decryptString(security.encryptedTotpSecret);
  return verifyTotp(secret, code, {
    window: 1,
    lastAcceptedStep: security.lastTotpStep
  });
};

const consumeRecoveryCode = (security: AuthSecurityDocument, recoveryCode: string): boolean => {
  const candidateHash = recoveryCodeHash(recoveryCode);
  const codeRecord = security.recoveryCodes.find(
    (item) => !item.consumedAt && timingSafeEqualHex(item.codeHash, candidateHash)
  );

  if (!codeRecord) {
    return false;
  }

  codeRecord.consumedAt = new Date();
  return true;
};

const verifySecondFactor = async (
  account: AuthAccount,
  security: AuthSecurityDocument,
  {
    totpCode,
    recoveryCode
  }: {
    totpCode?: string;
    recoveryCode?: string;
  }
): Promise<"totp" | "recovery_code"> => {
  if (totpCode) {
    const result = await validateTotpForSecurity(security, totpCode);

    if (result.valid && result.step !== undefined) {
      security.lastTotpStep = result.step;
      await security.save();
      return "totp";
    }
  }

  if (recoveryCode && consumeRecoveryCode(security, recoveryCode)) {
    await security.save();
    await audit(account, "auth.recovery_code.used");
    return "recovery_code";
  }

  throw new AppError("Invalid two-factor code", 401);
};

export const getTwoFactorStatus = async (
  account: AuthAccount
): Promise<TwoFactorStatusResponse> => {
  const security = await getOrCreateSecurity(account);

  return {
    enabled: security.twoFactorEnabled,
    enabledAt: security.twoFactorEnabledAt,
    recoveryCodesRemaining: security.recoveryCodes.filter((code) => !code.consumedAt).length
  };
};

export const beginTwoFactorSetup = async (
  account: AuthAccount
): Promise<TwoFactorSetupResponse> => {
  const security = await getOrCreateSecurity(account);
  const secret = generateTotpSecret();
  const expiresAt = addDuration(new Date(), env.TOTP_SETUP_EXPIRES_IN);
  const otpauthUri = createOtpAuthUri(env.TOTP_ISSUER, account.email, secret);
  const qrCodeDataUrl = await createQrCodeDataUrl(otpauthUri);

  security.pendingEncryptedTotpSecret = encryptString(secret);
  security.pendingSetupExpiresAt = expiresAt;
  security.pendingSetupAttempts = 0;
  await security.save();
  await audit(account, "auth.2fa.setup_started");

  return {
    otpauthUri,
    qrCodeDataUrl,
    expiresAt
  };
};

export const confirmTwoFactorSetup = async (
  account: AuthAccount,
  totpCode: string
): Promise<TwoFactorConfirmResponse> => {
  const security = await getOrCreateSecurity(account);
  const now = new Date();

  if (
    !security.pendingEncryptedTotpSecret ||
    !security.pendingSetupExpiresAt ||
    security.pendingSetupExpiresAt.getTime() <= now.getTime()
  ) {
    throw new AppError("Two-factor setup expired", 400);
  }

  if (security.pendingSetupAttempts >= env.TWO_FACTOR_MAX_ATTEMPTS) {
    throw new AppError("Too many two-factor setup attempts", 429);
  }

  const secret = decryptString(security.pendingEncryptedTotpSecret);
  const result = await verifyTotp(secret, totpCode, { window: 1 });

  if (!result.valid || result.step === undefined) {
    security.pendingSetupAttempts += 1;
    await security.save();
    await audit(account, "auth.2fa.challenge_failure", { phase: "setup" });
    throw new AppError("Invalid two-factor code", 400);
  }

  const recoveryCodes = createRecoveryCodes();
  const enabledAt = now;
  security.twoFactorEnabled = true;
  security.twoFactorEnabledAt = enabledAt;
  security.encryptedTotpSecret = security.pendingEncryptedTotpSecret;
  security.pendingEncryptedTotpSecret = undefined;
  security.pendingSetupExpiresAt = undefined;
  security.pendingSetupAttempts = 0;
  security.lastTotpStep = result.step;
  security.recoveryCodes = recoveryCodes.storedCodes;
  await security.save();
  await audit(account, "auth.2fa.enabled");
  await audit(account, "auth.recovery_code.regenerated", { source: "initial-enable" });
  await revokeAllSessionsForAccount(account.id, account.type, "2fa-enabled");

  return {
    enabledAt,
    recoveryCodes: recoveryCodes.rawCodes
  };
};

export const createTwoFactorLoginChallenge = async (
  account: AuthAccount
): Promise<TwoFactorChallengeResponse> => {
  await AuthChallengeModel.updateMany(
    {
      accountId: account.id,
      accountType: account.type,
      purpose: "LOGIN_VERIFICATION",
      consumedAt: { $exists: false },
      revokedAt: { $exists: false }
    },
    { revokedAt: new Date() }
  );

  const now = new Date();
  const expiresAt = addDuration(now, env.TWO_FACTOR_CHALLENGE_EXPIRES_IN);
  const challenge = await new AuthChallengeModel({
    accountId: account.id,
    accountType: account.type,
    purpose: "LOGIN_VERIFICATION",
    deliveryTargetHash: hashEmailForAudit(account.email),
    attempts: 0,
    maxAttempts: env.TWO_FACTOR_MAX_ATTEMPTS,
    resendAvailableAt: expiresAt,
    expiresAt
  }).save();
  await audit(account, "auth.2fa.challenge_created", { expiresAt });

  return {
    twoFactorToken: signTwoFactorChallengeToken({
      accountId: account.id,
      accountType: account.type,
      challengeId: String(challenge._id),
      email: account.email
    }),
    expiresAt
  };
};

export const verifyTwoFactorLoginChallenge = async (
  twoFactorToken: string,
  {
    totpCode,
    recoveryCode
  }: {
    totpCode?: string;
    recoveryCode?: string;
  },
  metadata: RequestMetadata
): Promise<AuthAccount> => {
  const payload = verifyTwoFactorChallengeToken(twoFactorToken);
  const now = new Date();
  const challenge = await AuthChallengeModel.findOne({
    _id: payload.challengeId,
    accountId: payload.sub,
    accountType: payload.role,
    purpose: "LOGIN_VERIFICATION",
    consumedAt: { $exists: false },
    revokedAt: { $exists: false },
    expiresAt: { $gt: now }
  });

  if (!challenge) {
    throw new AppError("Invalid two-factor challenge", 401);
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new AppError("Invalid two-factor challenge", 401);
  }

  const account = await findAccountById(payload.role, payload.sub);

  if (!account) {
    throw new AppError("Invalid two-factor challenge", 401);
  }

  assertAccessAllowed(account);
  const security = await getOrCreateSecurity(account);

  if (!security.twoFactorEnabled) {
    throw new AppError("Two-factor authentication is not enabled", 400);
  }

  try {
    const method = await verifySecondFactor(account, security, { totpCode, recoveryCode });
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
      throw new AppError("Invalid two-factor challenge", 401);
    }

    await writeAuditLog({
      eventType: "auth.login.success",
      actor: auditActor(account),
      organizationId: account.organizationId,
      target: { type: "account", id: account.id },
      metadata: { twoFactorMethod: method, ipAddress: metadata.ipAddress }
    });

    return account;
  } catch (error) {
    challenge.attempts += 1;

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.revokedAt = now;
      await audit(account, "auth.otp.lockout", { source: "two-factor-login" });
    }

    await challenge.save();
    await audit(account, "auth.2fa.challenge_failure", { phase: "login" });
    throw error;
  }
};

export const disableTwoFactor = async (
  account: AuthAccount,
  password: string,
  totpCode?: string,
  recoveryCode?: string
): Promise<void> => {
  const security = await getOrCreateSecurity(account);

  if (!security.twoFactorEnabled) {
    return;
  }

  if (!(await comparePasswordForLogin(account, password))) {
    throw new AppError("Invalid credentials", 401);
  }

  await verifySecondFactor(account, security, { totpCode, recoveryCode });
  security.twoFactorEnabled = false;
  security.twoFactorEnabledAt = undefined;
  security.encryptedTotpSecret = undefined;
  security.pendingEncryptedTotpSecret = undefined;
  security.pendingSetupExpiresAt = undefined;
  security.pendingSetupAttempts = 0;
  security.lastTotpStep = undefined;
  security.recoveryCodes = [];
  await security.save();
  await revokeAllSessionsForAccount(account.id, account.type, "2fa-disabled");
  await audit(account, "auth.2fa.disabled");
};

export const regenerateRecoveryCodes = async (
  account: AuthAccount,
  password: string,
  totpCode?: string,
  recoveryCode?: string
): Promise<string[]> => {
  const security = await getOrCreateSecurity(account);

  if (!security.twoFactorEnabled) {
    throw new AppError("Two-factor authentication is not enabled", 400);
  }

  if (!(await comparePasswordForLogin(account, password))) {
    throw new AppError("Invalid credentials", 401);
  }

  await verifySecondFactor(account, security, { totpCode, recoveryCode });
  const recoveryCodes = createRecoveryCodes();
  security.recoveryCodes = recoveryCodes.storedCodes;
  await security.save();
  await revokeAllSessionsForAccount(account.id, account.type, "recovery-codes-regenerated");
  await audit(account, "auth.recovery_code.regenerated");

  return recoveryCodes.rawCodes;
};
