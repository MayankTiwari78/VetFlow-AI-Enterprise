import bcrypt from "bcrypt";

import { env } from "../config/env.js";
import {
  type AccountStatus,
  type AccountType,
  GENERIC_AUTH_ERROR,
  type AuthenticationProvider
} from "../constants/auth.js";
import { defaultRoleForAccountType, type EnterpriseRole } from "../constants/rbac.js";
import DoctorModel from "../models/Doctor.js";
import UserModel from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { normalizeEmail } from "../utils/authCrypto.js";
import { parseDurationMs } from "../utils/duration.js";

const DUMMY_PASSWORD_HASH = "$2b$10$wH6b7k5kzzzzzzzzzzzzzug3A3L2wS6xCw8VpY3B2h7.1zzzzzzzu";

interface AccountRecord {
  _id: unknown;
  name?: string;
  email: string;
  normalizedEmail?: string;
  password: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  accountStatus?: AccountStatus;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  authenticationProvider?: AuthenticationProvider;
  role?: EnterpriseRole;
  organizationId?: string;
}

interface AdminLockState {
  attempts: number;
  lockedUntil?: Date;
}

export interface AuthAccount {
  id: string;
  type: AccountType;
  name?: string;
  email: string;
  normalizedEmail: string;
  passwordHash?: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  accountStatus: AccountStatus;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  authenticationProvider: AuthenticationProvider;
  role: EnterpriseRole;
  organizationId?: string;
}

const adminLocks = new Map<string, AdminLockState>();

const documentToAccount = (
  record: AccountRecord,
  type: Exclude<AccountType, "admin">
): AuthAccount => ({
  id: String(record._id),
  type,
  name: record.name,
  email: record.email,
  normalizedEmail: record.normalizedEmail ?? normalizeEmail(record.email),
  passwordHash: record.password,
  emailVerified: record.emailVerified ?? true,
  emailVerifiedAt: record.emailVerifiedAt,
  accountStatus: record.accountStatus ?? "ACTIVE",
  failedLoginAttempts: record.failedLoginAttempts ?? 0,
  lockedUntil: record.lockedUntil,
  passwordChangedAt: record.passwordChangedAt,
  lastLoginAt: record.lastLoginAt,
  authenticationProvider: record.authenticationProvider ?? "LOCAL",
  role: record.role ?? defaultRoleForAccountType(type),
  organizationId: record.organizationId
});

const adminAccount = (): AuthAccount => {
  const normalizedEmail = normalizeEmail(env.ADMIN_EMAIL);
  const lockState = adminLocks.get(normalizedEmail);

  return {
    id: normalizedEmail,
    type: "admin",
    email: normalizedEmail,
    normalizedEmail,
    emailVerified: true,
    emailVerifiedAt: undefined,
    accountStatus: "ACTIVE",
    failedLoginAttempts: lockState?.attempts ?? 0,
    lockedUntil: lockState?.lockedUntil,
    authenticationProvider: "LOCAL",
    role: "HOSPITAL_ADMIN"
  };
};

export const findPatientByEmail = async (email: string): Promise<AuthAccount | null> => {
  const normalizedEmail = normalizeEmail(email);
  const byNormalizedEmail = await UserModel.findOne({ normalizedEmail });
  const record = byNormalizedEmail ?? (await UserModel.findOne({ email: normalizedEmail }));

  return record ? documentToAccount(record, "patient") : null;
};

export const findDoctorByEmail = async (email: string): Promise<AuthAccount | null> => {
  const normalizedEmail = normalizeEmail(email);
  const byNormalizedEmail = await DoctorModel.findOne({ normalizedEmail });
  const record = byNormalizedEmail ?? (await DoctorModel.findOne({ email: normalizedEmail }));

  return record ? documentToAccount(record, "doctor") : null;
};

export const findAccountByEmail = async (
  accountType: AccountType,
  email: string
): Promise<AuthAccount | null> => {
  if (accountType === "patient") {
    return findPatientByEmail(email);
  }

  if (accountType === "doctor") {
    return findDoctorByEmail(email);
  }

  return normalizeEmail(email) === normalizeEmail(env.ADMIN_EMAIL) ? adminAccount() : null;
};

export const findAccountById = async (
  accountType: AccountType,
  accountId: string
): Promise<AuthAccount | null> => {
  if (accountType === "patient") {
    const record = await UserModel.findById(accountId);
    return record ? documentToAccount(record, "patient") : null;
  }

  if (accountType === "doctor") {
    const record = await DoctorModel.findById(accountId);
    return record ? documentToAccount(record, "doctor") : null;
  }

  return accountId === normalizeEmail(env.ADMIN_EMAIL) ? adminAccount() : null;
};

export const ensureEmailAvailableForPatientRegistration = async (email: string): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);
  const [patient, doctor] = await Promise.all([
    findPatientByEmail(normalizedEmail),
    findDoctorByEmail(normalizedEmail)
  ]);

  if (patient || doctor || normalizedEmail === normalizeEmail(env.ADMIN_EMAIL)) {
    throw new AppError("email already exists", 409);
  }
};

export const comparePasswordForLogin = async (
  account: AuthAccount | null,
  password: string
): Promise<boolean> => {
  if (!account?.passwordHash) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH).catch(() => false);
    return false;
  }

  return bcrypt.compare(password, account.passwordHash);
};

export const recordFailedLogin = async (account: AuthAccount): Promise<void> => {
  const now = new Date();
  const failedLoginAttempts = account.failedLoginAttempts + 1;
  const lockUntil =
    failedLoginAttempts >= env.AUTH_LOCK_MAX_ATTEMPTS
      ? new Date(now.getTime() + parseDurationMs(env.AUTH_LOCK_DURATION))
      : undefined;

  if (account.type === "admin") {
    adminLocks.set(account.normalizedEmail, {
      attempts: failedLoginAttempts,
      lockedUntil: lockUntil
    });
    return;
  }

  const update = {
    failedLoginAttempts,
    ...(lockUntil ? { lockedUntil: lockUntil } : {})
  };

  if (account.type === "patient") {
    await UserModel.findByIdAndUpdate(account.id, update);
    return;
  }

  await DoctorModel.findByIdAndUpdate(account.id, update);
};

export const recordSuccessfulLogin = async (account: AuthAccount): Promise<void> => {
  const update = {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date()
  };

  if (account.type === "admin") {
    adminLocks.delete(account.normalizedEmail);
    return;
  }

  if (account.type === "patient") {
    await UserModel.findByIdAndUpdate(account.id, update);
    return;
  }

  await DoctorModel.findByIdAndUpdate(account.id, update);
};

export const updatePasswordForAccount = async (
  account: AuthAccount,
  passwordHash: string
): Promise<void> => {
  if (account.type === "admin") {
    throw new AppError("Password reset is not available for this account", 400);
  }

  const update = {
    password: passwordHash,
    passwordChangedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null
  };

  if (account.type === "patient") {
    await UserModel.findByIdAndUpdate(account.id, update);
    return;
  }

  await DoctorModel.findByIdAndUpdate(account.id, update);
};

export const markEmailVerified = async (account: AuthAccount): Promise<void> => {
  if (account.type === "admin") {
    return;
  }

  const now = new Date();
  const update = {
    emailVerified: true,
    emailVerifiedAt: now,
    accountStatus: "ACTIVE" satisfies AccountStatus
  };

  if (account.type === "patient") {
    await UserModel.findByIdAndUpdate(account.id, update);
    return;
  }

  await DoctorModel.findByIdAndUpdate(account.id, update);
};

export const assertAccountCanAuthenticate = (account: AuthAccount): void => {
  const now = new Date();

  if (account.lockedUntil && account.lockedUntil.getTime() > now.getTime()) {
    throw new AppError("Account temporarily locked. Please try again later.", 423);
  }

  if (account.accountStatus === "SUSPENDED" || account.accountStatus === "DISABLED") {
    throw new AppError("Account is not active", 403);
  }

  if (account.accountStatus === "PENDING_VERIFICATION" || !account.emailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }
};

export const assertAccessAllowed = (account: AuthAccount): void => {
  if (account.accountStatus === "SUSPENDED" || account.accountStatus === "DISABLED") {
    throw new AppError("Not Authorized Login Again", 401);
  }

  if (account.accountStatus === "PENDING_VERIFICATION" || !account.emailVerified) {
    throw new AppError("Not Authorized Login Again", 401);
  }
};

export const genericInvalidCredentials = (): AppError => new AppError(GENERIC_AUTH_ERROR, 401);
