import mongoose, { type HydratedDocument, type Model } from "mongoose";

import { ACCOUNT_TYPES, type AccountType } from "../constants/auth.js";
import {
  ENTERPRISE_ROLES,
  MEMBERSHIP_STATUSES,
  PERMISSIONS,
  type EnterpriseRole,
  type MembershipStatus,
  type Permission
} from "../constants/rbac.js";

export interface OrganizationMembership {
  organizationId: string;
  accountId: string;
  accountType: AccountType;
  role: EnterpriseRole;
  scopedPermissions: Permission[];
  status: MembershipStatus;
  invitedByAccountId?: string;
  activatedAt?: Date;
  suspendedAt?: Date;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationMembershipDocument = HydratedDocument<OrganizationMembership>;

const organizationMembershipSchema = new mongoose.Schema<OrganizationMembership>(
  {
    organizationId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    role: { type: String, enum: ENTERPRISE_ROLES, required: true, index: true },
    scopedPermissions: [{ type: String, enum: PERMISSIONS }],
    status: { type: String, enum: MEMBERSHIP_STATUSES, default: "ACTIVE", index: true },
    invitedByAccountId: { type: String },
    activatedAt: { type: Date },
    suspendedAt: { type: Date },
    revokedAt: { type: Date }
  },
  { timestamps: true }
);

organizationMembershipSchema.index(
  { organizationId: 1, accountId: 1, accountType: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" }
  }
);
organizationMembershipSchema.index({ organizationId: 1, role: 1, status: 1 });

const OrganizationMembershipModel =
  (mongoose.models.organization_membership as Model<OrganizationMembership> | undefined) ??
  mongoose.model<OrganizationMembership>("organization_membership", organizationMembershipSchema);

export default OrganizationMembershipModel;
