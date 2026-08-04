import type { Request, Response } from "express";

import { env } from "../config/env.js";
import { parseDurationMs } from "./duration.js";

const REFRESH_COOKIE_PATH = "/api/v1/auth";

const refreshCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: env.isProduction || env.COOKIE_SAME_SITE === "none",
  sameSite: env.COOKIE_SAME_SITE,
  path: REFRESH_COOKIE_PATH,
  ...(maxAge !== undefined ? { maxAge } : {})
});

export const getCookie = (req: Request, name: string): string | undefined => {
  const header = req.get("cookie");

  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");

    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
};

export const getRefreshTokenCookie = (req: Request): string | undefined =>
  getCookie(req, env.COOKIE_NAME);

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
  expiresAt?: Date
): void => {
  const maxAge = expiresAt
    ? Math.max(expiresAt.getTime() - Date.now(), 0)
    : parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN);

  res.cookie(env.COOKIE_NAME, refreshToken, refreshCookieOptions(maxAge));
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(env.COOKIE_NAME, refreshCookieOptions(0));
};
