import crypto from "node:crypto";

import { env } from "../config/env.js";

export const generateSecureToken = (): string => crypto.randomBytes(32).toString("base64url");

export const generateTokenId = (): string => crypto.randomUUID();

export const generateOtp = (): string => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export const hashSecret = (value: string, purpose: string): string =>
  crypto.createHmac("sha256", env.JWT_REFRESH_SECRET).update(`${purpose}:${value}`).digest("hex");

export const timingSafeEqualHex = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const hashEmailForAudit = (email: string): string =>
  hashSecret(normalizeEmail(email), "email-audit");
