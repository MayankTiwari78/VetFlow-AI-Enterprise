import type { Request } from "express";

import type { AuditInput } from "../services/auditService.js";

export const auditContextFromRequest = (
  request: Request
): Pick<AuditInput, "actor" | "organizationId" | "request"> => ({
  actor: {
    accountId: request.authAccountId,
    accountType: request.authAccountType,
    role: request.authRole
  },
  organizationId: request.authOrganizationId,
  request
});
