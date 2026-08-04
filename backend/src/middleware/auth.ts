import type { Request, RequestHandler } from "express";
import type { JwtPayload } from "jsonwebtoken";

import { env } from "../config/env.js";
import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";
import {
  assertAccessAllowed,
  findAccountById,
  type AuthAccount
} from "../services/accountService.js";
import {
  resolveAuthorizationContext,
  type AuthorizationContext
} from "../services/organizationService.js";
import {
  verifyAccessToken,
  verifyLegacyToken,
  type AccessTokenPayload
} from "../services/tokenService.js";
import { AppError } from "../utils/AppError.js";

const getBearerToken = (req: Request): string | undefined => {
  const authorization = req.get("authorization");
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
};

const getTokenFromHeaders = (req: Request, legacyHeader?: string): string | undefined =>
  getBearerToken(req) ?? (legacyHeader ? req.get(legacyHeader) : undefined);

const isLegacyJwtPayload = (payload: JwtPayload | string): payload is JwtPayload =>
  typeof payload !== "string";

const verifyRequestToken = (token: string): AccessTokenPayload | JwtPayload | string => {
  try {
    return verifyAccessToken(token);
  } catch {
    return verifyLegacyToken(token);
  }
};

const getPayloadId = (payload: AccessTokenPayload | JwtPayload | string): string | undefined => {
  if (typeof payload === "string") {
    return undefined;
  }

  if (typeof payload.sub === "string" && payload.tokenType === "access") {
    return payload.sub;
  }

  return typeof payload.id === "string" ? payload.id : undefined;
};

const getPayloadRole = (
  payload: AccessTokenPayload | JwtPayload | string
): AccountType | undefined => {
  if (typeof payload === "string") {
    return undefined;
  }

  const role: unknown = payload.role;

  if (role === "patient" || role === "doctor" || role === "admin") {
    return role;
  }

  return undefined;
};

const assertTokenNotInvalidatedByPasswordChange = (
  payload: AccessTokenPayload | JwtPayload,
  account: AuthAccount
): void => {
  if (!account.passwordChangedAt || typeof payload.iat !== "number") {
    return;
  }

  if (payload.iat * 1000 < account.passwordChangedAt.getTime()) {
    throw new AppError("Not Authorized Login Again", 401);
  }
};

const attachRequestAccount = (
  req: Request,
  payload: AccessTokenPayload | JwtPayload | string,
  account: AuthAccount,
  authorization: AuthorizationContext
): void => {
  req.auth = payload;
  req.authAccountType = account.type;
  req.authAccountId = account.id;
  req.authRole = authorization.role;
  req.authPermissions = authorization.permissions;
  req.authOrganizationId = authorization.organizationId;
  req.authMembershipId = authorization.membershipId;

  if (typeof payload !== "string" && typeof payload.sessionId === "string") {
    req.authSessionId = payload.sessionId;
  }

  if (account.type === "patient") {
    req.authUserId = account.id;
  } else if (account.type === "doctor") {
    req.authDoctorId = account.id;
  } else {
    req.authAdminEmail = env.ADMIN_EMAIL;
  }
};

export const authenticate = async (
  req: Request,
  expectedAccountType?: AccountType,
  legacyHeader?: string
): Promise<void> => {
  const token = getTokenFromHeaders(req, legacyHeader);

  if (!token) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  const payload = verifyRequestToken(token);

  if (typeof payload === "string") {
    const legacyPayload = `${env.ADMIN_EMAIL}${env.ADMIN_PASSWORD}`;

    if (expectedAccountType !== "admin" || payload !== legacyPayload) {
      throw new AppError("Not Authorized Login Again", 401);
    }

    const account = await findAccountById("admin", env.ADMIN_EMAIL);

    if (!account) {
      throw new AppError("Not Authorized Login Again", 401);
    }

    const authorization = await resolveAuthorizationContext(account);
    attachRequestAccount(req, payload, account, authorization);
    return;
  }

  const accountType = getPayloadRole(payload);
  const accountId = getPayloadId(payload);

  if (!accountType || (expectedAccountType && accountType !== expectedAccountType)) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  if (accountType === "admin") {
    if (
      !isLegacyJwtPayload(payload) ||
      payload.email !== env.ADMIN_EMAIL ||
      (expectedAccountType && expectedAccountType !== "admin")
    ) {
      throw new AppError("Not Authorized Login Again", 401);
    }

    const account = await findAccountById("admin", env.ADMIN_EMAIL);

    if (!account) {
      throw new AppError("Not Authorized Login Again", 401);
    }

    const authorization = await resolveAuthorizationContext(account);
    attachRequestAccount(req, payload, account, authorization);
    return;
  }

  if (!accountId) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  const account = await findAccountById(accountType, accountId);

  if (!account) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  assertAccessAllowed(account);
  assertTokenNotInvalidatedByPasswordChange(payload, account);
  const authorization = await resolveAuthorizationContext(account);
  attachRequestAccount(req, payload, account, authorization);
};

export const authorizeRoles =
  (...roles: EnterpriseRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.authRole) {
      next(new AppError("Not Authorized Login Again", 401));
      return;
    }

    if (!roles.includes(req.authRole)) {
      next(new AppError("Forbidden", 403));
      return;
    }

    next();
  };

export const authorizePermissions =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.authPermissions) {
      next(new AppError("Not Authorized Login Again", 401));
      return;
    }

    const hasEveryPermission = permissions.every((permission) =>
      req.authPermissions?.includes(permission)
    );

    if (!hasEveryPermission) {
      next(new AppError("Forbidden", 403));
      return;
    }

    next();
  };

export const requireOrganization: RequestHandler = (req, _res, next) => {
  if (!req.authOrganizationId) {
    next(new AppError("Organization membership is required", 403));
    return;
  }

  next();
};

export const enforceTenantScope =
  (organizationIdFromRequest: (req: Request) => string | undefined): RequestHandler =>
  (req, _res, next) => {
    const resourceOrganizationId = organizationIdFromRequest(req);

    if (!resourceOrganizationId || req.authRole === "SUPER_ADMIN") {
      next();
      return;
    }

    if (req.authOrganizationId !== resourceOrganizationId) {
      next(new AppError("Resource not found", 404));
      return;
    }

    next();
  };

export const enforceOwnershipOrPermission =
  ({
    ownerIdFromRequest,
    permission
  }: {
    ownerIdFromRequest: (req: Request) => string | undefined;
    permission: Permission;
  }): RequestHandler =>
  (req, _res, next) => {
    const ownerId = ownerIdFromRequest(req);
    const isOwner = Boolean(ownerId && req.authAccountId === ownerId);
    const hasPermission = Boolean(req.authPermissions?.includes(permission));

    if (!isOwner && !hasPermission) {
      next(new AppError("Forbidden", 403));
      return;
    }

    next();
  };

export const authUser: RequestHandler = async (req, _res, next) => {
  try {
    await authenticate(req, "patient", "token");
    next();
  } catch (error) {
    next(error);
  }
};

export const authDoctor: RequestHandler = async (req, _res, next) => {
  try {
    await authenticate(req, "doctor", "dtoken");
    next();
  } catch (error) {
    next(error);
  }
};

export const authAdmin: RequestHandler = async (req, _res, next) => {
  try {
    await authenticate(req, "admin", "atoken");
    next();
  } catch (error) {
    next(error);
  }
};

export const authAny: RequestHandler = async (req, _res, next) => {
  try {
    await authenticate(req);
    next();
  } catch (error) {
    next(error);
  }
};
