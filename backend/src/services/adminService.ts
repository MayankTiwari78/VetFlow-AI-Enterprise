import bcrypt from "bcrypt";

import { env } from "../config/env.js";
import { DEFAULT_DOCTOR_IMAGE } from "../constants/defaults.js";
import AppointmentModel from "../models/Appointment.js";
import DoctorModel from "../models/Doctor.js";
import OrganizationMembershipModel from "../models/OrganizationMembership.js";
import UserModel from "../models/User.js";
import type { Address } from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import { getAppointmentStatus, sanitizeAppointmentForAdmin } from "../utils/appointments.js";
import { normalizeEmail } from "../utils/authCrypto.js";
import { removeSensitiveFields } from "../utils/sanitize.js";
import { releaseAppointmentSlot } from "./userService.js";
import { resolveDoctorAvailability } from "./availabilityService.js";
import { writeAuditLog } from "./auditService.js";
import { uploadImageToCloudinary } from "./uploadService.js";

type AddDoctorPayload = {
  name: string;
  email: string;
  password: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  fees: number;
  address: Address;
};

const organizationFilter = (organizationId?: string) =>
  organizationId ? { $or: [{ organizationId }, { organizationId: { $exists: false } }] } : {};

export const listAllAppointments = async (organizationId?: string): Promise<unknown[]> => {
  const appointments = await AppointmentModel.find(organizationFilter(organizationId)).sort({ date: -1 });
  return appointments.map(sanitizeAppointmentForAdmin);
};

export const cancelAdminAppointment = async (
  appointmentId: string,
  organizationId?: string
): Promise<void> => {
  const appointment = await AppointmentModel.findById(appointmentId);

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  if (
    organizationId &&
    appointment.organizationId &&
    appointment.organizationId !== organizationId
  ) {
    throw new AppError("Appointment not found", 404);
  }

  if (getAppointmentStatus(appointment) !== "scheduled") {
    throw new AppError("Only scheduled appointments can be cancelled", 409);
  }

  await AppointmentModel.findByIdAndUpdate(appointmentId, {
    status: "cancelled",
    cancelled: true,
    isCompleted: false
  });
  await releaseAppointmentSlot(appointment.docId, appointment.slotDate, appointment.slotTime);
};

export const createDoctor = async (
  payload: AddDoctorPayload,
  file?: Express.Multer.File,
  organizationId?: string
): Promise<void> => {
  if (!file) {
    throw new AppError("Image Not Selected", 400);
  }

  const normalizedEmail = normalizeEmail(payload.email);
  const [existingDoctor, existingPatient] = await Promise.all([
    DoctorModel.findOne({ email: normalizedEmail }),
    UserModel.findOne({ email: normalizedEmail })
  ]);

  if (existingDoctor || existingPatient || normalizedEmail === normalizeEmail(env.ADMIN_EMAIL)) {
    throw new AppError("email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const image = await uploadImageToCloudinary(file.path, {
    developmentFallbackUrl: DEFAULT_DOCTOR_IMAGE
  });

  const doctor = await new DoctorModel({
    ...payload,
    email: normalizedEmail,
    normalizedEmail,
    image,
    password: hashedPassword,
    emailVerified: true,
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    authenticationProvider: "LOCAL",
    role: "DOCTOR",
    organizationId,
    date: Date.now()
  }).save();

  if (organizationId) {
    await new OrganizationMembershipModel({
      organizationId,
      accountId: String(doctor._id),
      accountType: "doctor",
      role: "DOCTOR",
      scopedPermissions: [],
      status: "ACTIVE",
      activatedAt: new Date()
    }).save();
  }

  await writeAuditLog({
    eventType: "doctor.created",
    organizationId,
    target: { type: "doctor", id: String(doctor._id) },
    metadata: { email: normalizedEmail }
  });
};

export const listAllDoctors = async (organizationId?: string): Promise<unknown[]> => {
  const doctors = await DoctorModel.find(organizationFilter(organizationId)).select("-password");
  const appointments = await AppointmentModel.find(organizationFilter(organizationId));
  return doctors.map((doctor) => {
    const safe = removeSensitiveFields(doctor) as unknown as Record<string, unknown>;
    delete safe.slots_booked;
    safe.availability = resolveDoctorAvailability(doctor);
    safe.appointmentWorkload = appointments.filter(
      (appointment) => appointment.docId === String(doctor._id) && getAppointmentStatus(appointment) === "scheduled"
    ).length;
    return safe;
  });
};

export const listPatients = async (
  organizationId: string | undefined,
  search: string,
  status: string
): Promise<unknown[]> => {
  const users = await UserModel.find(organizationFilter(organizationId));
  const appointments = await AppointmentModel.find(organizationFilter(organizationId));
  const query = search.toLowerCase();

  return users
    .filter((user) => status === "ALL" || user.accountStatus === status)
    .filter(
      (user) =>
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.toLowerCase().includes(query)
    )
    .map((user) => {
      const patientAppointments = appointments.filter(
        (appointment) => appointment.userId === String(user._id)
      );
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        gender: user.gender,
        dob: user.dob,
        accountStatus: user.accountStatus,
        organizationId: user.organizationId,
        appointmentCount: patientAppointments.length,
        lastAppointmentAt: patientAppointments[0]?.createdAt ?? patientAppointments[0]?.date
      };
    });
};

export const listPatientAppointmentHistory = async (
  patientId: string,
  organizationId?: string
): Promise<unknown[]> => {
  const patient = await UserModel.findById(patientId);
  if (!patient) throw new AppError("Patient not found", 404);
  if (organizationId && patient.organizationId && patient.organizationId !== organizationId) {
    throw new AppError("Patient not found", 404);
  }

  const appointments = await AppointmentModel.find({
    userId: patientId,
    ...organizationFilter(organizationId)
  }).sort({ date: -1 });
  return appointments.map(sanitizeAppointmentForAdmin);
};

export const updateAdminAppointmentStatus = async (
  appointmentId: string,
  status: "completed" | "cancelled",
  organizationId?: string
): Promise<void> => {
  const appointment = await AppointmentModel.findById(appointmentId);
  if (!appointment) throw new AppError("Appointment not found", 404);
  if (organizationId && appointment.organizationId && appointment.organizationId !== organizationId) {
    throw new AppError("Appointment not found", 404);
  }
  if (getAppointmentStatus(appointment) !== "scheduled") {
    throw new AppError("Only scheduled appointments can be updated", 409);
  }

  await AppointmentModel.findByIdAndUpdate(appointmentId, {
    status,
    cancelled: status === "cancelled",
    isCompleted: status === "completed"
  });
  if (status === "cancelled") {
    await releaseAppointmentSlot(appointment.docId, appointment.slotDate, appointment.slotTime);
  }
};

export const getAdminClinicalNotes = async (
  appointmentId: string,
  organizationId?: string
): Promise<{ clinicalNotes: string; clinicalNotesUpdatedAt?: Date }> => {
  const appointment = await AppointmentModel.findById(appointmentId).select("+clinicalNotes");
  if (!appointment) throw new AppError("Appointment not found", 404);
  if (organizationId && appointment.organizationId && appointment.organizationId !== organizationId) {
    throw new AppError("Appointment not found", 404);
  }
  return {
    clinicalNotes: appointment.clinicalNotes ?? "",
    clinicalNotesUpdatedAt: appointment.clinicalNotesUpdatedAt
  };
};

export const getAdminDashboard = async (
  organizationId?: string
): Promise<Record<string, unknown>> => {
  const [doctors, users, appointments] = await Promise.all([
    DoctorModel.find(organizationFilter(organizationId)),
    UserModel.find(organizationFilter(organizationId)),
    AppointmentModel.find(organizationFilter(organizationId)).sort({ date: -1 })
  ]);

  return {
    doctors: doctors.length,
    appointments: appointments.length,
    patients: users.length,
    latestAppointments: appointments
  };
};
