import type { RequestHandler } from "express";

import { ENTERPRISE_ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "../constants/rbac.js";
import { sendSuccess } from "../utils/response.js";

export const currentAuthorization: RequestHandler = (req, res) => {
  sendSuccess(res, 200, "Authorization context loaded", {
    role: req.authRole,
    permissions: req.authPermissions ?? [],
    organizationId: req.authOrganizationId,
    membershipId: req.authMembershipId
  });
};

export const rolePermissionMatrix: RequestHandler = (_req, res) => {
  sendSuccess(res, 200, "Role permissions loaded", {
    roles: ENTERPRISE_ROLES,
    permissions: PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS
  });
};
