import { env } from "../config/env.js";
import type { AccountType } from "../constants/auth.js";
import {
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
  ROLE_PERMISSIONS,
  ROLE_PRECEDENCE,
  defaultRoleForAccountType,
  type EnterpriseRole,
  type MembershipStatus,
  type Permission
} from "../constants/rbac.js";
import OrganizationModel from "../models/Organization.js";
import OrganizationMembershipModel from "../models/OrganizationMembership.js";
import { AppError } from "../utils/AppError.js";
import { type AuthAccount } from "./accountService.js";
import { writeAuditLog } from "./auditService.js";

export interface AuthorizationContext {
  accountId: string;
  accountType: AccountType;
  organizationId?: string;
  role: EnterpriseRole;
  permissions: Permission[];
  membershipId?: string;
}

const uniquePermissions = (permissions: readonly Permission[]): Permission[] => [
  ...new Set(permissions)
];

export const rolePermissions = (
  role: EnterpriseRole,
  scopedPermissions: Permission[] = []
): Permission[] => uniquePermissions([...ROLE_PERMISSIONS[role], ...scopedPermissions]);

export const getOrCreateDefaultOrganization = async (): Promise<{ id: string; name: string }> => {
  const slug = env.DEFAULT_ORGANIZATION_SLUG || DEFAULT_ORGANIZATION_SLUG;
  const existing = await OrganizationModel.findOne({ slug });

  if (existing) {
    return { id: String(existing._id), name: existing.name };
  }

  const created = await new OrganizationModel({
    name: env.DEFAULT_ORGANIZATION_NAME || DEFAULT_ORGANIZATION_NAME,
    slug,
    status: "ACTIVE",
    settings: {}
  }).save();

  await writeAuditLog({
    eventType: "organization.created",
    organizationId: String(created._id),
    target: { type: "organization", id: String(created._id) },
    metadata: { source: "default-backfill" }
  });

  return { id: String(created._id), name: created.name };
};

export const ensureDefaultMembership = async (
  account: AuthAccount
): Promise<AuthorizationContext> => {
  const defaultOrganization = await getOrCreateDefaultOrganization();
  const role = account.role ?? defaultRoleForAccountType(account.type);
  const activeMembership = await OrganizationMembershipModel.findOne({
    organizationId: account.organizationId ?? defaultOrganization.id,
    accountId: account.id,
    accountType: account.type,
    status: "ACTIVE"
  });

  if (activeMembership) {
    return {
      accountId: account.id,
      accountType: account.type,
      organizationId: activeMembership.organizationId,
      role: activeMembership.role,
      permissions: rolePermissions(activeMembership.role, activeMembership.scopedPermissions),
      membershipId: String(activeMembership._id)
    };
  }

  const created = await new OrganizationMembershipModel({
    organizationId: account.organizationId ?? defaultOrganization.id,
    accountId: account.id,
    accountType: account.type,
    role,
    scopedPermissions: [],
    status: "ACTIVE",
    activatedAt: new Date()
  }).save();

  await writeAuditLog({
    eventType: "membership.created",
    actor: { accountId: account.id, accountType: account.type, role },
    organizationId: created.organizationId,
    target: { type: "membership", id: String(created._id) },
    metadata: { source: "default-membership" }
  });

  return {
    accountId: account.id,
    accountType: account.type,
    organizationId: created.organizationId,
    role,
    permissions: rolePermissions(role),
    membershipId: String(created._id)
  };
};

export const resolveAuthorizationContext = async (
  account: AuthAccount
): Promise<AuthorizationContext> => {
  const membership = await OrganizationMembershipModel.findOne({
    accountId: account.id,
    accountType: account.type,
    status: "ACTIVE"
  });

  if (membership) {
    return {
      accountId: account.id,
      accountType: account.type,
      organizationId: membership.organizationId,
      role: membership.role,
      permissions: rolePermissions(membership.role, membership.scopedPermissions),
      membershipId: String(membership._id)
    };
  }

  return ensureDefaultMembership(account);
};

export const assertCanAssignRole = (
  actorRole: EnterpriseRole,
  targetRole: EnterpriseRole,
  sameAccount: boolean
): void => {
  if (sameAccount) {
    throw new AppError("Self role escalation is not allowed", 403);
  }

  if (actorRole !== "SUPER_ADMIN" && targetRole === "SUPER_ADMIN") {
    throw new AppError("Only super admins can assign super admin role", 403);
  }

  if (ROLE_PRECEDENCE[targetRole] >= ROLE_PRECEDENCE[actorRole] && actorRole !== "SUPER_ADMIN") {
    throw new AppError("Cannot assign a role at or above your own level", 403);
  }
};

export const createOrganization = async ({
  name,
  slug,
  contactEmail,
  actor
}: {
  name: string;
  slug: string;
  contactEmail?: string;
  actor: AuthorizationContext;
}) => {
  if (actor.role !== "SUPER_ADMIN") {
    throw new AppError("Insufficient permissions", 403);
  }

  const organization = await new OrganizationModel({
    name,
    slug,
    contactEmail,
    status: "ACTIVE",
    settings: {}
  }).save();

  await writeAuditLog({
    eventType: "organization.created",
    actor: {
      accountId: actor.accountId,
      accountType: actor.accountType,
      role: actor.role
    },
    organizationId: String(organization._id),
    target: { type: "organization", id: String(organization._id) }
  });

  return organization;
};

export const listMemberships = async (organizationId: string) =>
  OrganizationMembershipModel.find({ organizationId }).sort({ createdAt: -1 });

export const upsertMembership = async ({
  actor,
  organizationId,
  accountId,
  accountType,
  role,
  scopedPermissions = [],
  status = "ACTIVE"
}: {
  actor: AuthorizationContext;
  organizationId: string;
  accountId: string;
  accountType: AccountType;
  role: EnterpriseRole;
  scopedPermissions?: Permission[];
  status?: MembershipStatus;
}) => {
  if (actor.organizationId !== organizationId && actor.role !== "SUPER_ADMIN") {
    throw new AppError("Cross-organization membership changes are not allowed", 403);
  }

  assertCanAssignRole(
    actor.role,
    role,
    actor.accountId === accountId && actor.accountType === accountType
  );

  if (
    actor.role !== "SUPER_ADMIN" &&
    scopedPermissions.some((permission) => !actor.permissions.includes(permission))
  ) {
    throw new AppError("Cannot assign permissions you do not have", 403);
  }

  const existing = await OrganizationMembershipModel.findOne({
    organizationId,
    accountId,
    accountType,
    status: "ACTIVE"
  });

  if (existing) {
    if (existing.role === "HOSPITAL_ADMIN" && status !== "ACTIVE") {
      const activeAdmins = await OrganizationMembershipModel.find({
        organizationId,
        role: "HOSPITAL_ADMIN",
        status: "ACTIVE"
      });
      const remainingAdmins = activeAdmins.filter(
        (membership) => membership.accountId !== accountId || membership.accountType !== accountType
      );

      if (remainingAdmins.length === 0) {
        throw new AppError("Cannot remove the final active hospital administrator", 409);
      }
    }

    existing.role = role;
    existing.scopedPermissions = scopedPermissions;
    existing.status = status;
    if (status === "REVOKED") {
      existing.revokedAt = new Date();
    }
    await existing.save();

    await writeAuditLog({
      eventType: status === "REVOKED" ? "membership.revoked" : "membership.changed",
      actor: { accountId: actor.accountId, accountType: actor.accountType, role: actor.role },
      organizationId,
      target: { type: "membership", id: String(existing._id) },
      metadata: { role, status }
    });

    return existing;
  }

  const membership = await new OrganizationMembershipModel({
    organizationId,
    accountId,
    accountType,
    role,
    scopedPermissions,
    status,
    activatedAt: status === "ACTIVE" ? new Date() : undefined,
    invitedByAccountId: actor.accountId
  }).save();

  await writeAuditLog({
    eventType: "membership.created",
    actor: { accountId: actor.accountId, accountType: actor.accountType, role: actor.role },
    organizationId,
    target: { type: "membership", id: String(membership._id) },
    metadata: { role, status }
  });

  return membership;
};

export const assertSameOrganization = (
  actor: AuthorizationContext,
  organizationId?: string
): void => {
  if (!organizationId || actor.role === "SUPER_ADMIN") {
    return;
  }

  if (actor.organizationId !== organizationId) {
    throw new AppError("Resource not found", 404);
  }
};
