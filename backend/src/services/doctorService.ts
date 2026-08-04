import AppointmentModel from "../models/Appointment.js";
import DoctorModel, { type Doctor } from "../models/Doctor.js";
import type { Address } from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import { getAppointmentStatus, sanitizeAppointmentForAdmin } from "../utils/appointments.js";
import { removeSensitiveFields } from "../utils/sanitize.js";
import {
  getDoctorAvailability,
  resolveDoctorAvailability,
  saveDoctorAvailability
} from "./availabilityService.js";
import { appointmentBelongsToDoctor, releaseAppointmentSlot } from "./userService.js";

type DoctorProfileUpdate = {
  fees: number;
  address: Address;
  available: boolean;
  about?: string;
};

const organizationFilter = (organizationId?: string) =>
  organizationId ? { $or: [{ organizationId }, { organizationId: { $exists: false } }] } : {};

const assertResourceOrganization = (
  resourceOrganizationId: string | undefined,
  organizationId?: string
): void => {
  if (organizationId && resourceOrganizationId && resourceOrganizationId !== organizationId) {
    throw new AppError("Resource not found", 404);
  }
};

export const listPublicDoctors = async (): Promise<unknown[]> => {
  const doctors = await DoctorModel.find({}).select("-password -email");
  return doctors.map((doctor) => {
    const safe = removeSensitiveFields(doctor) as unknown as Record<string, unknown>;
    delete safe.slots_booked;
    safe.availability = resolveDoctorAvailability(doctor);
    return safe;
  });
};

export const listDoctorAppointments = async (
  docId: string,
  organizationId?: string
): Promise<unknown[]> => {
  const appointments = await AppointmentModel.find({
    docId,
    ...organizationFilter(organizationId)
  })
    .select("+clinicalNotes")
    .sort({ date: -1 });

  return appointments.map((appointment) => {
    const safe = sanitizeAppointmentForAdmin(appointment);
    safe.clinicalNotes = appointment.clinicalNotes ?? "";
    safe.clinicalNotesUpdatedAt = appointment.clinicalNotesUpdatedAt;
    return safe;
  });
};

export const cancelDoctorAppointment = async (
  docId: string,
  appointmentId: string,
  organizationId?: string
): Promise<void> => {
  const appointment = await AppointmentModel.findById(appointmentId);

  if (!appointment || !appointmentBelongsToDoctor(appointment, docId)) {
    throw new AppError("Unauthorized action", 403);
  }

  assertResourceOrganization(appointment.organizationId, organizationId);

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

export const completeDoctorAppointment = async (
  docId: string,
  appointmentId: string,
  organizationId?: string
): Promise<void> => {
  const appointment = await AppointmentModel.findById(appointmentId);

  if (!appointment || !appointmentBelongsToDoctor(appointment, docId)) {
    throw new AppError("Unauthorized action", 403);
  }

  assertResourceOrganization(appointment.organizationId, organizationId);

  if (getAppointmentStatus(appointment) !== "scheduled") {
    throw new AppError("Only scheduled appointments can be completed", 409);
  }

  await AppointmentModel.findByIdAndUpdate(appointmentId, {
    status: "completed",
    isCompleted: true,
    cancelled: false
  });
};

export const changeDoctorAvailability = async (
  docId: string,
  organizationId?: string
): Promise<void> => {
  const doctor = await DoctorModel.findById(docId);

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  assertResourceOrganization(doctor.organizationId, organizationId);

  const availability = resolveDoctorAvailability(doctor);
  await DoctorModel.findByIdAndUpdate(docId, {
    available: !doctor.available,
    availability: { ...availability, enabled: !doctor.available }
  });
};

export const getDoctorProfile = async (
  docId: string,
  organizationId?: string
): Promise<unknown> => {
  const doctor = await DoctorModel.findById(docId).select("-password");

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  assertResourceOrganization(doctor.organizationId, organizationId);

  return removeSensitiveFields(doctor);
};

export const updateDoctorProfile = async (
  docId: string,
  payload: DoctorProfileUpdate,
  organizationId?: string
): Promise<void> => {
  const existing = await DoctorModel.findById(docId);

  if (!existing) {
    throw new AppError("Doctor not found", 404);
  }

  assertResourceOrganization(existing.organizationId, organizationId);

  const update: Partial<Doctor> = {
    fees: payload.fees,
    address: payload.address,
    available: payload.available,
    availability: {
      ...resolveDoctorAvailability(existing),
      enabled: payload.available
    }
  };

  if (payload.about) {
    update.about = payload.about;
  }

  const doctor = await DoctorModel.findByIdAndUpdate(docId, update, {
    new: true,
    runValidators: true
  });

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }
};

export const getOwnDoctorAvailability = getDoctorAvailability;
export const updateOwnDoctorAvailability = saveDoctorAvailability;

export const updateDoctorClinicalNotes = async (
  docId: string,
  appointmentId: string,
  clinicalNotes: string,
  organizationId?: string
): Promise<{ clinicalNotes: string; clinicalNotesUpdatedAt: Date }> => {
  const appointment = await AppointmentModel.findById(appointmentId).select("+clinicalNotes");
  if (!appointment || !appointmentBelongsToDoctor(appointment, docId)) {
    throw new AppError("Appointment not found", 404);
  }
  assertResourceOrganization(appointment.organizationId, organizationId);
  if (getAppointmentStatus(appointment) === "cancelled") {
    throw new AppError("Clinical notes cannot be added to a cancelled appointment", 409);
  }

  const clinicalNotesUpdatedAt = new Date();
  await AppointmentModel.findByIdAndUpdate(appointmentId, {
    clinicalNotes,
    clinicalNotesUpdatedAt
  });
  return { clinicalNotes, clinicalNotesUpdatedAt };
};

export const getDoctorDashboard = async (
  docId: string,
  organizationId?: string
): Promise<Record<string, unknown>> => {
  const appointments = await AppointmentModel.find({
    docId,
    ...organizationFilter(organizationId)
  }).sort({ date: -1 });
  const earnings = appointments.reduce(
    (total, appointment) =>
      total + (appointment.isCompleted || appointment.payment ? appointment.amount : 0),
    0
  );

  const patients = new Set(appointments.map((appointment) => appointment.userId));

  return {
    earnings,
    appointments: appointments.length,
    patients: patients.size,
    latestAppointments: appointments
  };
};
