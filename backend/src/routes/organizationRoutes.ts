import { Router } from "express";

import {
  createOrganizationRequest,
  currentOrganization,
  organizationMemberships,
  upsertOrganizationMembership
} from "../controllers/organizationController.js";
import { authAny, authorizePermissions, requireOrganization } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createOrganizationSchema,
  organizationIdParamSchema,
  upsertMembershipSchema
} from "../validators/authorizationValidators.js";

const organizationRouter = Router();

organizationRouter.get(
  "/current",
  authAny,
  requireOrganization,
  authorizePermissions("organization:read"),
  currentOrganization
);
organizationRouter.post(
  "/",
  authAny,
  authorizePermissions("organization:manage"),
  validateRequest({ body: createOrganizationSchema }),
  createOrganizationRequest
);
organizationRouter.get(
  "/:organizationId/memberships",
  authAny,
  authorizePermissions("organization:read", "roles:read"),
  validateRequest({ params: organizationIdParamSchema }),
  organizationMemberships
);
organizationRouter.put(
  "/:organizationId/memberships",
  authAny,
  authorizePermissions("organization:manage", "roles:manage"),
  validateRequest({ params: organizationIdParamSchema, body: upsertMembershipSchema }),
  upsertOrganizationMembership
);

export default organizationRouter;
