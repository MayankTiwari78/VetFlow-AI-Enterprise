import type { Request } from "express";

import type { AccountType } from "../constants/auth.js";
import type { AuditEventType } from "../constants/audit.js";
import AuditLogModel from "../models/AuditLog.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "otp",
  "totp",
  "secret",
  "code",
  "recoveryCode",
  "recoveryCodes",
  "hash",
  "tokenHash",
  "otpHash"
]);

export interface AuditInput {
  eventType: AuditEventType;
  actor?: {
    accountId?: string;
    accountType?: AccountType;
    role?: string;
  };
  organizationId?: string;
  target?: {
    type?: string;
    id?: string;
  };
  request?: Request;
  metadata?: Record<string, unknown>;
}

const redactMetadata = (value: Record<string, unknown> = {}): Record<string, unknown> => {
  const output: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    if (
      SENSITIVE_KEYS.has(key) ||
      [...SENSITIVE_KEYS].some((sensitive) => key.toLowerCase().includes(sensitive))
    ) {
      output[key] = "[REDACTED]";
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      output[key] = redactMetadata(item as Record<string, unknown>);
    } else {
      output[key] = item;
    }
  }

  return output;
};

export const writeAuditLog = async ({
  eventType,
  actor,
  organizationId,
  target,
  request,
  metadata
}: AuditInput): Promise<void> => {
  await new AuditLogModel({
    eventType,
    actor: actor ?? {},
    organizationId,
    target,
    requestId: request?.get("x-request-id"),
    ipAddress: request?.ip,
    userAgent: request?.get("user-agent"),
    metadata: redactMetadata(metadata)
  }).save();
};

export const listAuditLogs = async ({
  organizationId,
  eventType,
  actorId,
  limit,
  offset
}: {
  organizationId?: string;
  eventType?: AuditEventType;
  actorId?: string;
  limit: number;
  offset: number;
}): Promise<unknown[]> => {
  const filter: Record<string, unknown> = {};

  if (organizationId) {
    filter.organizationId = organizationId;
  }

  if (eventType) {
    filter.eventType = eventType;
  }

  if (actorId) {
    filter["actor.accountId"] = actorId;
  }

  return AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit);
};
