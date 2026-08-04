import mongoose from "mongoose";

import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/database.js";
import {
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
  defaultRoleForAccountType,
  type EnterpriseRole
} from "../constants/rbac.js";
import AppointmentModel from "../models/Appointment.js";
import AuthSecurityModel from "../models/AuthSecurity.js";
import DoctorModel from "../models/Doctor.js";
import OrganizationModel from "../models/Organization.js";
import OrganizationMembershipModel from "../models/OrganizationMembership.js";
import UserModel from "../models/User.js";
import { normalizeEmail } from "../utils/authCrypto.js";

interface BackfillStats {
  usersUpdated: number;
  doctorsUpdated: number;
  appointmentsUpdated: number;
  membershipsCreated: number;
  authSecurityCreated: number;
}

const ensureDefaultOrganization = async (): Promise<string> => {
  const slug = env.DEFAULT_ORGANIZATION_SLUG || DEFAULT_ORGANIZATION_SLUG;
  const existing = await OrganizationModel.findOne({ slug });

  if (existing) {
    return String(existing._id);
  }

  const created = await new OrganizationModel({
    name: env.DEFAULT_ORGANIZATION_NAME || DEFAULT_ORGANIZATION_NAME,
    slug,
    status: "ACTIVE",
    settings: {}
  }).save();

  return String(created._id);
};

const ensureMembership = async ({
  organizationId,
  accountId,
  accountType,
  role
}: {
  organizationId: string;
  accountId: string;
  accountType: "patient" | "doctor" | "admin";
  role: EnterpriseRole;
}): Promise<boolean> => {
  const existing = await OrganizationMembershipModel.findOne({
    organizationId,
    accountId,
    accountType,
    status: "ACTIVE"
  });

  if (existing) {
    return false;
  }

  await new OrganizationMembershipModel({
    organizationId,
    accountId,
    accountType,
    role,
    scopedPermissions: [],
    status: "ACTIVE",
    activatedAt: new Date()
  }).save();

  return true;
};

const ensureAuthSecurity = async (
  accountId: string,
  accountType: "patient" | "doctor" | "admin"
): Promise<boolean> => {
  const existing = await AuthSecurityModel.findOne({ accountId, accountType });

  if (existing) {
    return false;
  }

  await new AuthSecurityModel({
    accountId,
    accountType,
    twoFactorEnabled: false,
    pendingSetupAttempts: 0,
    recoveryCodes: []
  }).save();

  return true;
};

const reportMembershipConflicts = async (): Promise<void> => {
  const conflicts = await OrganizationMembershipModel.aggregate<{
    _id: { organizationId: string; accountId: string; accountType: string };
    count: number;
  }>([
    { $match: { status: "ACTIVE" } },
    {
      $group: {
        _id: {
          organizationId: "$organizationId",
          accountId: "$accountId",
          accountType: "$accountType"
        },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (conflicts.length > 0) {
    console.warn("Duplicate active membership conflicts detected; resolve manually.", conflicts);
  }
};

const run = async (): Promise<void> => {
  await connectDB();
  const defaultOrganizationId = await ensureDefaultOrganization();
  const stats: BackfillStats = {
    usersUpdated: 0,
    doctorsUpdated: 0,
    appointmentsUpdated: 0,
    membershipsCreated: 0,
    authSecurityCreated: 0
  };

  const users = await UserModel.find({});
  for (const user of users) {
    const userId = String(user._id);
    const update: Partial<{ role: EnterpriseRole; organizationId: string }> = {};

    if (!user.role) {
      update.role = defaultRoleForAccountType("patient");
    }

    if (!user.organizationId) {
      update.organizationId = defaultOrganizationId;
    }

    if (Object.keys(update).length > 0) {
      await UserModel.findByIdAndUpdate(userId, update);
      stats.usersUpdated += 1;
    }

    if (
      await ensureMembership({
        organizationId: user.organizationId ?? defaultOrganizationId,
        accountId: userId,
        accountType: "patient",
        role: user.role ?? "PATIENT"
      })
    ) {
      stats.membershipsCreated += 1;
    }

    if (await ensureAuthSecurity(userId, "patient")) {
      stats.authSecurityCreated += 1;
    }
  }

  const doctors = await DoctorModel.find({});
  for (const doctor of doctors) {
    const doctorId = String(doctor._id);
    const update: Partial<{ role: EnterpriseRole; organizationId: string }> = {};

    if (!doctor.role) {
      update.role = defaultRoleForAccountType("doctor");
    }

    if (!doctor.organizationId) {
      update.organizationId = defaultOrganizationId;
    }

    if (Object.keys(update).length > 0) {
      await DoctorModel.findByIdAndUpdate(doctorId, update);
      stats.doctorsUpdated += 1;
    }

    if (
      await ensureMembership({
        organizationId: doctor.organizationId ?? defaultOrganizationId,
        accountId: doctorId,
        accountType: "doctor",
        role: doctor.role ?? "DOCTOR"
      })
    ) {
      stats.membershipsCreated += 1;
    }

    if (await ensureAuthSecurity(doctorId, "doctor")) {
      stats.authSecurityCreated += 1;
    }
  }

  const appointments = await AppointmentModel.updateMany(
    { organizationId: { $exists: false } },
    { organizationId: defaultOrganizationId }
  );
  stats.appointmentsUpdated = appointments.modifiedCount;

  if (
    await ensureMembership({
      organizationId: defaultOrganizationId,
      accountId: normalizeEmail(env.ADMIN_EMAIL),
      accountType: "admin",
      role: "HOSPITAL_ADMIN"
    })
  ) {
    stats.membershipsCreated += 1;
  }

  if (await ensureAuthSecurity(normalizeEmail(env.ADMIN_EMAIL), "admin")) {
    stats.authSecurityCreated += 1;
  }

  await reportMembershipConflicts();

  console.info("Phase 1C backfill completed safely.", {
    defaultOrganizationId,
    stats,
    superAdminCreated: false
  });
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Phase 1C backfill failed");
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDB().then(() => mongoose.connection.removeAllListeners());
  });
