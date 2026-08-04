import { z } from "zod";

import { AUDIT_EVENT_TYPES } from "../constants/audit.js";
import { ACCOUNT_TYPES } from "../constants/auth.js";
import { ENTERPRISE_ROLES, MEMBERSHIP_STATUSES, PERMISSIONS } from "../constants/rbac.js";

const optionalTotpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Authenticator code must be 6 digits")
  .optional();

const optionalRecoveryCode = z.string().trim().min(8).max(32).optional();

const secondFactorFields = {
  totpCode: optionalTotpCode,
  recoveryCode: optionalRecoveryCode
};

const requireSecondFactor = (
  value: { totpCode?: string; recoveryCode?: string },
  context: z.RefinementCtx
): void => {
  if (!value.totpCode && !value.recoveryCode) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Authenticator code or recovery code is required"
    });
  }
};

export const verifyTwoFactorLoginSchema = z
  .object({
    ...secondFactorFields,
    twoFactorToken: z.string().trim().min(24, "Two-factor challenge token is required")
  })
  .superRefine(requireSecondFactor);

export const confirmTwoFactorSetupSchema = z.object({
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Authenticator code must be 6 digits")
});

export const disableTwoFactorSchema = z
  .object({
    ...secondFactorFields,
    password: z.string().min(1, "Password is required")
  })
  .superRefine(requireSecondFactor);

export const regenerateRecoveryCodesSchema = disableTwoFactorSchema;

export const sessionIdParamSchema = z.object({
  sessionId: z.string().trim().min(8).max(120)
});

export const renameSessionSchema = z.object({
  displayName: z.string().trim().min(1).max(120)
});

const boundedInteger = (defaultValue: number, max: number) =>
  z
    .preprocess((value) => (value === undefined ? defaultValue : Number(value)), z.number().int())
    .pipe(z.number().int().min(0).max(max));

export const auditLogQuerySchema = z.object({
  eventType: z.enum(AUDIT_EVENT_TYPES).optional(),
  organizationId: z.string().trim().min(1).max(120).optional(),
  actorId: z.string().trim().min(1).max(120).optional(),
  limit: boundedInteger(25, 100),
  offset: boundedInteger(0, 10_000)
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens")
    .min(2)
    .max(80),
  contactEmail: z.string().trim().email().optional()
});

export const organizationIdParamSchema = z.object({
  organizationId: z.string().trim().min(1).max(120)
});

export const upsertMembershipSchema = z.object({
  accountId: z.string().trim().min(1).max(120),
  accountType: z.enum(ACCOUNT_TYPES),
  role: z.enum(ENTERPRISE_ROLES),
  scopedPermissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length).default([]),
  status: z.enum(MEMBERSHIP_STATUSES).default("ACTIVE")
});
