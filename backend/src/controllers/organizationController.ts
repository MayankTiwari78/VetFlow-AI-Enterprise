import type { Request, RequestHandler } from "express";

import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";
import OrganizationModel from "../models/Organization.js";
import {
  createOrganization,
  listMemberships,
  upsertMembership,
  type AuthorizationContext
} from "../services/organizationService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

const authorizationContext = (req: Request): AuthorizationContext => {
  if (!req.authAccountId || !req.authAccountType || !req.authRole || !req.authPermissions) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  return {
    accountId: req.authAccountId,
    accountType: req.authAccountType,
    organizationId: req.authOrganizationId,
    role: req.authRole,
    permissions: req.authPermissions,
    membershipId: req.authMembershipId
  };
};

const assertOrganizationAccess = (req: Request, organizationId: string): void => {
  if (req.authRole === "SUPER_ADMIN") {
    return;
  }

  if (!req.authOrganizationId || req.authOrganizationId !== organizationId) {
    throw new AppError("Resource not found", 404);
  }
};

export const createOrganizationRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { name, slug, contactEmail } = req.body as {
    name: string;
    slug: string;
    contactEmail?: string;
  };
  const organization = await createOrganization({
    name,
    slug,
    contactEmail,
    actor: authorizationContext(req)
  });
  sendSuccess(res, 201, "Organization created", { organization });
});

export const currentOrganization: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authOrganizationId) {
    throw new AppError("Organization membership is required", 403);
  }

  const organization = await OrganizationModel.findById(req.authOrganizationId);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  sendSuccess(res, 200, "Organization loaded", { organization });
});

export const organizationMemberships: RequestHandler = asyncHandler(async (req, res) => {
  const { organizationId } = req.params as { organizationId: string };
  assertOrganizationAccess(req, organizationId);
  const memberships = await listMemberships(organizationId);
  sendSuccess(res, 200, "Memberships loaded", { memberships });
});

export const upsertOrganizationMembership: RequestHandler = asyncHandler(async (req, res) => {
  const { organizationId } = req.params as { organizationId: string };
  const { accountId, accountType, role, scopedPermissions, status } = req.body as {
    accountId: string;
    accountType: AccountType;
    role: EnterpriseRole;
    scopedPermissions: Permission[];
    status: "INVITED" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  };
  assertOrganizationAccess(req, organizationId);

  const membership = await upsertMembership({
    actor: authorizationContext(req),
    organizationId,
    accountId,
    accountType,
    role,
    scopedPermissions,
    status
  });

  sendSuccess(res, 200, "Membership updated", { membership });
});
