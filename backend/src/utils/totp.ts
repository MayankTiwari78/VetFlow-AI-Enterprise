import crypto from "node:crypto";

import { generateSecret, generateSync, generateURI, verify } from "otplib";

const TOTP_ALGORITHM = "sha1";
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;

export const generateTotpSecret = (): string => generateSecret({ length: 20 });

export const generateTotpCode = (secret: string, now = Date.now()): string =>
  generateSync({
    secret,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    epoch: Math.floor(now / 1000)
  });

export const createOtpAuthUri = (issuer: string, accountLabel: string, secret: string): string =>
  generateURI({
    issuer,
    label: accountLabel,
    secret,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS
  });

export const currentTotpStep = (now = Date.now()): number =>
  Math.floor(Math.floor(now / 1000) / TOTP_PERIOD_SECONDS);

export const verifyTotp = async (
  secret: string,
  token: string,
  options: { lastAcceptedStep?: number; window?: number; now?: number } = {}
): Promise<{ valid: boolean; step?: number }> => {
  const now = options.now ?? Date.now();
  const result = await verify({
    secret,
    token,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    epoch: Math.floor(now / 1000),
    epochTolerance: (options.window ?? 1) * TOTP_PERIOD_SECONDS,
    afterTimeStep: options.lastAcceptedStep
  });

  return result.valid
    ? { valid: true, step: currentTotpStep(now) + result.delta }
    : { valid: false };
};

export const generateRecoveryCode = (): string =>
  `${crypto.randomBytes(4).toString("hex")}-${crypto.randomBytes(4).toString("hex")}`.toUpperCase();
