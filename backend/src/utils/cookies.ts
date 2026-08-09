import type { Request, Response } from "express";

import { env } from "../config/env.js";
import type { AccountType } from "../constants/auth.js";
import { parseDurationMs } from "./duration.js";

const REFRESH_COOKIE_PATH = "/api/v1/auth";

export const refreshCookieNameForRole = (role: AccountType): string => {
  if (role === "doctor") {
    return env.DOCTOR_COOKIE_NAME;
  }

  if (role === "admin") {
    return env.ADMIN_COOKIE_NAME;
  }

  return env.PATIENT_COOKIE_NAME;
};

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

export const getRefreshTokenCookie = (req: Request, role: AccountType): string | undefined =>
  getCookie(req, refreshCookieNameForRole(role));

export const getLegacyRefreshTokenCookie = (req: Request): string | undefined =>
  getCookie(req, env.COOKIE_NAME);

export const setRefreshTokenCookie = (
  res: Response,
  role: AccountType,
  refreshToken: string,
  expiresAt?: Date
): void => {
  const maxAge = expiresAt
    ? Math.max(expiresAt.getTime() - Date.now(), 0)
    : parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN);

  res.cookie(refreshCookieNameForRole(role), refreshToken, refreshCookieOptions(maxAge));
};

export const clearRefreshTokenCookie = (res: Response, role?: AccountType): void => {
  // Clear the requested role cookie, every role cookie when no role is given,
  // plus the legacy shared cookie so stale sessions are removed.
  const allRoles: AccountType[] = ["patient", "doctor", "admin"];
  const names = [
    ...(role ? [refreshCookieNameForRole(role)] : allRoles.map((item) => refreshCookieNameForRole(item))),
    env.COOKIE_NAME
  ];

  for (const name of new Set(names)) {
    res.clearCookie(name, refreshCookieOptions(0));
  }
};