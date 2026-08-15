import AppointmentModel, { type Appointment } from "../models/Appointment.js";
import DoctorModel, { type Doctor } from "../models/Doctor.js";
import UserModel, { type User } from "../models/User.js";
import type { Address, PatientHealthProfile, UserProfileSnapshot } from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import {
  getAppointmentStatus,
  isFutureSlot,
  sanitizeAppointmentForPatient
} from "../utils/appointments.js";
import { DEFAULT_USER_IMAGE } from "../constants/defaults.js";
import { removeSensitiveFields } from "../utils/sanitize.js";
import { assertBookableDoctorSlot } from "./availabilityService.js";
import { uploadImageToCloudinary } from "./uploadService.js";

type UserUpdatePayload = {
  name: string;
  phone: string;
  address: Address;
  dob: string;
  gender: string;
};

type BookAppointmentPayload = {
  docId: string;
  slotDate: string;
  slotTime: string;
};

type HealthProfileUpdatePayload = {
  dob: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  medicalNotes: string;
  emergencyContact: PatientHealthProfile["emergencyContact"];
  insurance: PatientHealthProfile["insurance"];
};

const toStringId = (value: unknown): string => String(value);

const ensureUser = async (userId: string) => {
  const user = await UserModel.findById(userId).select("-password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const ensureDoctor = async (docId: string, organizationId?: string) => {
  const doctor = await DoctorModel.findById(docId).select("-password");

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  if (organizationId && doctor.organizationId && doctor.organizationId !== organizationId) {
    throw new AppError("Doctor not found", 404);
  }

  return doctor;
};

const assertAppointmentOrganization = (appointment: Appointment, organizationId?: string): void => {
  if (
    organizationId &&
    appointment.organizationId &&
    appointment.organizationId !== organizationId
  ) {
    throw new AppError("Appointment not found", 404);
  }
};

const releaseDoctorSlot = async (
  docId: string,
  slotDate: string,
  slotTime: string
): Promise<void> => {
  const doctor = await DoctorModel.findById(docId);

  if (!doctor) {
    return;
  }

  const slotsBooked = { ...(doctor.slots_booked ?? {}) };
  slotsBooked[slotDate] = (slotsBooked[slotDate] ?? []).filter((time) => time !== slotTime);

  await DoctorModel.findByIdAndUpdate(docId, { slots_booked: slotsBooked });
};

export const getPatientProfile = async (userId: string): Promise<unknown> => {
  const user = await ensureUser(userId);
  return removeSensitiveFields(user);
};

export const getPatientHealthProfile = async (userId: string): Promise<unknown> => {
  const user = await ensureUser(userId);
  const profile = user.healthProfile ?? {
    bloodGroup: "Not known",
    allergies: [],
    chronicConditions: [],
    medicalNotes: "",
    emergencyContact: { name: "", relationship: "", phone: "" },
    insurance: { provider: "", policyNumber: "", expiryDate: "" }
  };

  return { dob: user.dob, gender: user.gender, ...removeSensitiveFields(profile) };
};

export const updatePatientHealthProfile = async (
  userId: string,
  payload: HealthProfileUpdatePayload
): Promise<unknown> => {
  const healthProfile: PatientHealthProfile = {
    bloodGroup: payload.bloodGroup,
    allergies: payload.allergies,
    chronicConditions: payload.chronicConditions,
    medicalNotes: payload.medicalNotes,
    emergencyContact: payload.emergencyContact,
    insurance: payload.insurance,
    updatedAt: new Date()
  };

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { dob: payload.dob, gender: payload.gender, healthProfile },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError("User not found", 404);
  return { dob: user.dob, gender: user.gender, ...removeSensitiveFields(user.healthProfile) };
};

export const updatePatientProfile = async (
  userId: string,
  payload: UserUpdatePayload,
  file?: Express.Multer.File
): Promise<unknown> => {
  const update: Partial<User> = {
    name: payload.name,
    phone: payload.phone,
    address: payload.address,
    dob: payload.dob,
    gender: payload.gender
  };

  if (file) {
    update.image = await uploadImageToCloudinary(file.path, {
      developmentFallbackUrl: DEFAULT_USER_IMAGE
    });
  }

  const updated = await UserModel.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true
  });

  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return removeSensitiveFields(updated);
};

export const deletePatientProfileImage = async (userId: string): Promise<unknown> => {
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    { image: DEFAULT_USER_IMAGE },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return removeSensitiveFields(updated);
};

export const bookPatientAppointment = async (
  userId: string,
  payload: BookAppointmentPayload,
  organizationId?: string
): Promise<{ appointmentId: string; slotDate: string; slotTime: string }> => {
  const doctor = await ensureDoctor(payload.docId, organizationId);
  const slotDate = await assertBookableDoctorSlot(doctor, payload.slotDate, payload.slotTime);

  const user = await ensureUser(userId);
  const resolvedOrganizationId = organizationId ?? doctor.organizationId ?? user.organizationId;
  const userData: UserProfileSnapshot = {
    _id: user._id,
    name: user.name,
    email: user.email,
    image: user.image,
    phone: user.phone,
    address: user.address,
    gender: user.gender,
    dob: user.dob
  };
  const docData = removeSensitiveFields(doctor) as Partial<Doctor>;
  Reflect.deleteProperty(docData, "slots_booked");

  try {
    const appointment = await new AppointmentModel({
      userId,
      docId: payload.docId,
      userData,
      docData,
      amount: doctor.fees,
      organizationId: resolvedOrganizationId,
      slotTime: payload.slotTime,
      slotDate,
      status: "scheduled",
      cancelled: false,
      isCompleted: false,
      date: Date.now()
    }).save();

    const slotsBooked = { ...(doctor.slots_booked ?? {}) };
    slotsBooked[slotDate] = [...new Set([...(slotsBooked[slotDate] ?? []), payload.slotTime])];
    await DoctorModel.findByIdAndUpdate(payload.docId, { slots_booked: slotsBooked });

    return { appointmentId: String(appointment._id), slotDate, slotTime: payload.slotTime };
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AppError("Slot is no longer available", 409);
    }
    throw error;
  }
};

export const cancelPatientAppointment = async (
  userId: string,
  appointmentId: string,
  organizationId?: string
): Promise<void> => {
  const appointment = await AppointmentModel.findById(appointmentId);

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  if (appointment.userId !== userId) {
    throw new AppError("Unauthorized action", 403);
  }

  assertAppointmentOrganization(appointment, organizationId);

  if (getAppointmentStatus(appointment) !== "scheduled") {
    throw new AppError("Only scheduled appointments can be cancelled", 409);
  }

  if (!isFutureSlot(appointment.slotDate, appointment.slotTime)) {
    throw new AppError("Past appointments cannot be cancelled", 409);
  }

  await AppointmentModel.findByIdAndUpdate(appointmentId, {
    status: "cancelled",
    cancelled: true,
    isCompleted: false
  });
  await releaseDoctorSlot(appointment.docId, appointment.slotDate, appointment.slotTime);
};

export const listPatientAppointments = async (
  userId: string,
  organizationId?: string
): Promise<unknown[]> => {
  const appointments = await AppointmentModel.find({
    userId,
    ...(organizationId ? { $or: [{ organizationId }, { organizationId: { $exists: false } }] } : {})
  }).sort({ date: -1 });
  return appointments.map(sanitizeAppointmentForPatient);
};

export const ensurePatientAppointment = async (
  userId: string,
  appointmentId: string,
  organizationId?: string
): Promise<Appointment> => {
  const appointment = await AppointmentModel.findById(appointmentId);

  if (!appointment || appointment.cancelled) {
    throw new AppError("Appointment Cancelled or not found", 404);
  }

  if (appointment.userId !== userId) {
    throw new AppError("Unauthorized action", 403);
  }

  assertAppointmentOrganization(appointment, organizationId);

  return appointment;
};

export const markAppointmentPaid = async (
  appointmentId: string,
  fields: Partial<Appointment> = {}
): Promise<void> => {
  await AppointmentModel.findByIdAndUpdate(appointmentId, {
    ...fields,
    payment: true
  });
};

export const markAppointmentPaymentReference = async (
  appointmentId: string,
  fields: Partial<Appointment>
): Promise<void> => {
  await AppointmentModel.findByIdAndUpdate(appointmentId, fields);
};

export const releaseAppointmentSlot = releaseDoctorSlot;

export const appointmentBelongsToDoctor = (appointment: Appointment, docId: string): boolean =>
  toStringId(appointment.docId) === docId;
