import pino, { type LoggerOptions } from "pino";

import { env } from "../config/env.js";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.set-cookie",
  "res.headers.set-cookie",
  "*.password",
  "*.confirmPassword",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.refreshTokenHash",
  "*.tokenHash",
  "*.otp",
  "*.otpHash",
  "*.totpCode",
  "*.totpSecret",
  "*.encryptedTotpSecret",
  "*.pendingEncryptedTotpSecret",
  "*.recoveryCode",
  "*.recoveryCodes",
  "*.codeHash",
  "*.authorization",
  "*.cookie",
  "*.cookies",
  "*.smtpPassword",
  "*.SMTP_PASSWORD",
  "*.MONGODB_URI",
  "*.JWT_SECRET",
  "*.JWT_ACCESS_SECRET",
  "*.JWT_REFRESH_SECRET",
  "*.TWO_FACTOR_ENCRYPTION_KEY",
  "*.CLOUDINARY_SECRET_KEY",
  "*.RAZORPAY_KEY_SECRET",
  "*.STRIPE_SECRET_KEY"
];

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: {
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV
  },
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]"
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (request: { method?: string; url?: string; headers?: Record<string, unknown> }) => ({
      method: request.method,
      url: request.url,
      headers: request.headers
    }),
    res: (response: { statusCode?: number }) => ({
      statusCode: response.statusCode
    })
  },
  timestamp: pino.stdTimeFunctions.isoTime
};

export const logger = pino(
  env.isDevelopment
    ? {
        ...options,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname"
          }
        }
      }
    : options
);

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "cookies",
  "password",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "refreshTokenHash",
  "tokenHash",
  "otp",
  "otpHash",
  "totpCode",
  "totpSecret",
  "encryptedTotpSecret",
  "pendingEncryptedTotpSecret",
  "recoveryCode",
  "recoveryCodes",
  "codeHash",
  "smtpPassword",
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "TWO_FACTOR_ENCRYPTION_KEY",
  "CLOUDINARY_SECRET_KEY",
  "RAZORPAY_KEY_SECRET",
  "STRIPE_SECRET_KEY"
]);

export const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    redacted[key] = sensitiveKeys.has(key) ? "[REDACTED]" : redactSensitive(item);
  }

  return redacted;
};
