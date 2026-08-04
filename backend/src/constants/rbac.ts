export const ENTERPRISE_ROLES = [
  "SUPER_ADMIN",
  "HOSPITAL_ADMIN",
  "DOCTOR",
  "STAFF",
  "PATIENT"
] as const;

export type EnterpriseRole = (typeof ENTERPRISE_ROLES)[number];

export const PERMISSIONS = [
  "users:read",
  "users:manage",
  "doctors:read",
  "doctors:manage",
  "appointments:read",
  "appointments:create",
  "appointments:update",
  "appointments:cancel",
  "reports:read",
  "billing:read",
  "billing:manage",
  "sessions:read",
  "sessions:manage",
  "audit:read",
  "roles:read",
  "roles:manage",
  "organization:read",
  "organization:manage",
  "settings:manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: PERMISSIONS,
  HOSPITAL_ADMIN: [
    "users:read",
    "users:manage",
    "doctors:read",
    "doctors:manage",
    "appointments:read",
    "appointments:update",
    "appointments:cancel",
    "reports:read",
    "billing:read",
    "billing:manage",
    "sessions:read",
    "sessions:manage",
    "audit:read",
    "roles:read",
    "roles:manage",
    "organization:read",
    "organization:manage",
    "settings:manage"
  ],
  DOCTOR: [
    "doctors:read",
    "doctors:manage",
    "appointments:read",
    "appointments:update",
    "appointments:cancel",
    "reports:read",
    "sessions:read",
    "sessions:manage"
  ],
  STAFF: [
    "users:read",
    "doctors:read",
    "appointments:read",
    "appointments:create",
    "appointments:update",
    "billing:read",
    "sessions:read",
    "sessions:manage"
  ],
  PATIENT: [
    "users:read",
    "users:manage",
    "appointments:read",
    "appointments:create",
    "appointments:cancel",
    "billing:read",
    "sessions:read",
    "sessions:manage"
  ]
} as const satisfies Record<EnterpriseRole, readonly Permission[]>;

export const ORGANIZATION_STATUSES = ["ACTIVE", "SUSPENDED", "DISABLED"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const DEFAULT_ORGANIZATION_SLUG = "medflow-default";
export const DEFAULT_ORGANIZATION_NAME = "MedFlow Default Hospital";

export const ROLE_PRECEDENCE: Record<EnterpriseRole, number> = {
  SUPER_ADMIN: 50,
  HOSPITAL_ADMIN: 40,
  DOCTOR: 30,
  STAFF: 20,
  PATIENT: 10
};

export const hasPermissionInRole = (role: EnterpriseRole, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);

export const defaultRoleForAccountType = (
  accountType: "patient" | "doctor" | "admin"
): EnterpriseRole => {
  if (accountType === "doctor") {
    return "DOCTOR";
  }

  if (accountType === "admin") {
    return "HOSPITAL_ADMIN";
  }

  return "PATIENT";
};
