import type { RequestHandler } from "express";

import { listAuditLogs } from "../services/auditService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const listAuditLogEntries: RequestHandler = asyncHandler(async (req, res) => {
  const { eventType, organizationId, actorId, limit, offset } = req.query as unknown as {
    eventType?: Parameters<typeof listAuditLogs>[0]["eventType"];
    organizationId?: string;
    actorId?: string;
    limit: number;
    offset: number;
  };

  if (!req.authOrganizationId && req.authRole !== "SUPER_ADMIN") {
    throw new AppError("Organization membership is required", 403);
  }

  const scopedOrganizationId =
    req.authRole === "SUPER_ADMIN" ? organizationId : req.authOrganizationId;

  if (
    req.authRole !== "SUPER_ADMIN" &&
    organizationId &&
    organizationId !== req.authOrganizationId
  ) {
    throw new AppError("Resource not found", 404);
  }

  const auditLogs = await listAuditLogs({
    organizationId: scopedOrganizationId,
    eventType,
    actorId,
    limit,
    offset
  });

  sendSuccess(res, 200, "Audit logs loaded", {
    auditLogs,
    pagination: { limit, offset }
  });
});
