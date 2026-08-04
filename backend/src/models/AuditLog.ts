import mongoose, { type HydratedDocument, type Model } from "mongoose";

import { ACCOUNT_TYPES, type AccountType } from "../constants/auth.js";
import { AUDIT_EVENT_TYPES, type AuditEventType } from "../constants/audit.js";

export interface AuditActor {
  accountId?: string;
  accountType?: AccountType;
  role?: string;
}

export interface AuditTarget {
  type?: string;
  id?: string;
}

export interface AuditLog {
  eventType: AuditEventType;
  actor: AuditActor;
  organizationId?: string;
  target?: AuditTarget;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt?: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

const auditLogSchema = new mongoose.Schema<AuditLog>(
  {
    eventType: { type: String, enum: AUDIT_EVENT_TYPES, required: true, index: true },
    actor: {
      accountId: { type: String },
      accountType: { type: String, enum: ACCOUNT_TYPES },
      role: { type: String }
    },
    organizationId: { type: String, index: true },
    target: {
      type: { type: String },
      id: { type: String }
    },
    requestId: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ "actor.accountId": 1, createdAt: -1 });

const AuditLogModel =
  (mongoose.models.audit_log as Model<AuditLog> | undefined) ??
  mongoose.model<AuditLog>("audit_log", auditLogSchema);

export default AuditLogModel;
