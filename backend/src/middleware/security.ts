import cors from "cors";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  createCorsOriginPolicy,
  parseOriginList,
  parseProjectSlugs
} from "../config/cors.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { getCookie, refreshCookieNameForRole } from "../utils/cookies.js";
import { logger } from "../utils/logger.js";

const { origins: extraOrigins, invalid: invalidExtraOrigins } = parseOriginList(
  env.CORS_ALLOWED_ORIGINS
);

if (invalidExtraOrigins.length > 0) {
  logger.warn(
    { event: "cors.invalid_origins", invalidOrigins: invalidExtraOrigins },
    "Ignoring unusable CORS_ALLOWED_ORIGINS entries"
  );
}

if (env.isProduction && env.CORS_VERCEL_PREVIEW_PROJECTS.trim().length === 0) {
  logger.info(
    { event: "cors.vercel_previews_disabled" },
    "Vercel preview deployment origins are disabled; only explicit origins are trusted"
  );
}

// Production access stays explicit (never a `*` wildcard because the browser
// apps send the httpOnly refresh cookie), while Vercel production/preview
// deployment URLs and the local development servers keep working.
export const corsOriginPolicy = createCorsOriginPolicy({
  clientUrl: env.CLIENT_URL,
  adminUrl: env.ADMIN_URL,
  extraOrigins,
  vercelPreviewProjects: parseProjectSlugs(env.CORS_VERCEL_PREVIEW_PROJECTS),
  isDevelopment: env.isDevelopment
});

export const allowedOrigins = corsOriginPolicy.allowedOrigins;

export const helmetMiddleware = helmet();

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Requests without an Origin header (curl, health checks, server-to-server
    // calls) are not browser cross-origin requests, so they are left alone.
    if (!origin || corsOriginPolicy.isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError("Origin is not allowed by CORS", 403));
  },
  credentials: true,
  // OPTIONS preflight is answered by this middleware before the routers run, so
  // every accepted origin gets an explicit allow-origin/credentials response.
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
  // `allowedHeaders` is intentionally omitted: the cors middleware then reflects
  // the requested headers, which keeps the app's custom `token`, `aToken`,
  // `dToken` and `Authorization` headers working from every accepted origin.
  maxAge: 600
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

  if (requestOrigin && !corsOriginPolicy.isAllowedOrigin(requestOrigin)) {
    throw new AppError("Origin is not allowed for this authentication action", 403);
  }

  if (env.isProduction && refreshCookie && !requestOrigin) {
    throw new AppError("Origin is required for this authentication action", 403);
  }

  next();
};