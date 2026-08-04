import { Router } from "express";

import { listAuditLogEntries } from "../controllers/auditController.js";
import { authAny, authorizePermissions, requireOrganization } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { auditLogQuerySchema } from "../validators/authorizationValidators.js";

const auditRouter = Router();

auditRouter.get(
  "/",
  authAny,
  requireOrganization,
  authorizePermissions("audit:read"),
  validateRequest({ query: auditLogQuerySchema }),
  listAuditLogEntries
);

export default auditRouter;
