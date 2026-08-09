import cors from "cors";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { getCookie, refreshCookieNameForRole } from "../utils/cookies.js";

const developmentOrigins = env.isDevelopment
  ? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://localhost:3010",
      "http://127.0.0.1:3010",
      "http://localhost:3011",
      "http://127.0.0.1:3011"
    ]
  : [];

// Keep production origin access explicit while supporting both local loopback forms in development.
const allowedOrigins = new Set([env.CLIENT_URL, env.ADMIN_URL, ...developmentOrigins]);

export const helmetMiddleware = helmet();

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError("Origin is not allowed by CORS", 403));
  },
  credentials: true
});

const disabledRateLimiter: RequestHandler = (_req, _res, next) => next();

export const generalRateLimiter = env.isTest
  ? disabledRateLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests, please try again later",
        errors: []
      }
    });

export const authRateLimiter = env.isTest
  ? disabledRateLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 25,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many authentication attempts, please try again later",
        errors: []
      }
    });

const authLimiter = (limit: number, message: string): RequestHandler =>
  env.isTest
    ? disabledRateLimiter
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message,
          errors: []
        }
      });

export const registrationRateLimiter = authLimiter(
  15,
  "Too many registration attempts, please try again later"
);

export const refreshRateLimiter = authLimiter(
  60,
  "Too many refresh attempts, please try again later"
);

export const verificationRateLimiter = authLimiter(
  20,
  "Too many verification attempts, please try again later"
);

export const passwordResetRateLimiter = authLimiter(
  10,
  "Too many password reset attempts, please try again later"
);

export const otpRateLimiter = authLimiter(
  20,
  "Too many verification code attempts, please try again later"
);

export const csrfOriginProtection: RequestHandler = (req, _res, next) => {
  const origin = req.get("origin");
  const referer = req.get("referer");
  const refreshCookie =
    getCookie(req, env.COOKIE_NAME) ||
    getCookie(req, refreshCookieNameForRole("patient")) ||
    getCookie(req, refreshCookieNameForRole("doctor")) ||
    getCookie(req, refreshCookieNameForRole("admin"));

  let requestOrigin = origin;

  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      throw new AppError("Origin is not allowed for this authentication action", 403);
    }
  }

  if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
    throw new AppError("Origin is not allowed for this authentication action", 403);
  }

  if (env.isProduction && refreshCookie && !requestOrigin) {
    throw new AppError("Origin is required for this authentication action", 403);
  }

  next();
};