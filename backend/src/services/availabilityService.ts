import AppointmentModel from "../models/Appointment.js";
import DoctorModel, { type Doctor, type DoctorDocument } from "../models/Doctor.js";
import type { DoctorAvailability } from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import { getAppointmentStatus, isFutureSlot, normalizeSlotDate } from "../utils/appointments.js";

export const defaultDoctorAvailability = (): DoctorAvailability => ({
  enabled: true,
  timezone: "Asia/Kolkata",
  consultationDurationMinutes: 30,
  weeklySchedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    slots: ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]
  }))
});

export const resolveDoctorAvailability = (
  doctor: Pick<Doctor, "availability" | "available">
): DoctorAvailability => {
  const fallback = defaultDoctorAvailability();
  const availability = doctor.availability;

  if (!availability) {
    return { ...fallback, enabled: doctor.available };
  }

  return {
    enabled: availability.enabled ?? doctor.available,
    timezone: availability.timezone || fallback.timezone,
    consultationDurationMinutes:
      availability.consultationDurationMinutes || fallback.consultationDurationMinutes,
    weeklySchedule: Array.isArray(availability.weeklySchedule)
      ? availability.weeklySchedule.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          slots: [...new Set(day.slots)].sort()
        }))
      : fallback.weeklySchedule
  };
};

const assertDoctorOrganization = (doctor: DoctorDocument, organizationId?: string): void => {
  if (organizationId && doctor.organizationId && doctor.organizationId !== organizationId) {
    throw new AppError("Doctor not found", 404);
  }
};

export const getDoctorAvailability = async (
  doctorId: string,
  organizationId?: string
): Promise<DoctorAvailability> => {
  const doctor = await DoctorModel.findById(doctorId);
  if (!doctor) throw new AppError("Doctor not found", 404);
  assertDoctorOrganization(doctor, organizationId);
  return resolveDoctorAvailability(doctor);
};

export const saveDoctorAvailability = async (
  doctorId: string,
  availability: DoctorAvailability,
  organizationId?: string
): Promise<DoctorAvailability> => {
  const doctor = await DoctorModel.findById(doctorId);
  if (!doctor) throw new AppError("Doctor not found", 404);
  assertDoctorOrganization(doctor, organizationId);

  const normalized: DoctorAvailability = {
    ...availability,
    weeklySchedule: [...availability.weeklySchedule]
      .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
      .map((day) => ({ ...day, slots: [...new Set(day.slots)].sort() }))
  };

  await DoctorModel.findByIdAndUpdate(
    doctorId,
    { availability: normalized, available: normalized.enabled },
    { runValidators: true }
  );
  return normalized;
};

export const assertBookableDoctorSlot = async (
  doctor: DoctorDocument,
  requestedDate: string,
  requestedTime: string
): Promise<string> => {
  const slotDate = normalizeSlotDate(requestedDate);
  const availability = resolveDoctorAvailability(doctor);

  if (!doctor.available || !availability.enabled) {
    throw new AppError("Doctor is not accepting appointments", 409);
  }

  if (!isFutureSlot(slotDate, requestedTime)) {
    throw new AppError("Choose an upcoming appointment time", 409);
  }

  const date = new Date(`${slotDate}T12:00:00`);
  const daySchedule = availability.weeklySchedule.find(
    (item) => item.dayOfWeek === date.getDay()
  );
  if (!daySchedule?.slots.includes(requestedTime)) {
    throw new AppError("This time is outside the doctor's availability", 409);
  }

  const existing = await AppointmentModel.findOne({
    docId: String(doctor._id),
    slotDate,
    slotTime: requestedTime,
    status: "scheduled"
  });
  if (existing) throw new AppError("Slot is no longer available", 409);

  return slotDate;
};

export const listDoctorAvailableSlots = async (
  doctorId: string,
  from: string | undefined,
  days: number
): Promise<{ timezone: string; consultationDurationMinutes: number; days: { date: string; slots: string[] }[] }> => {
  const doctor = await DoctorModel.findById(doctorId);
  if (!doctor) throw new AppError("Doctor not found", 404);

  const availability = resolveDoctorAvailability(doctor);
  const start = from ? new Date(`${from}T12:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) throw new AppError("Invalid start date", 400);
  start.setHours(12, 0, 0, 0);

  const appointments = await AppointmentModel.find({ docId: doctorId });
  const booked = new Set(
    appointments
      .filter((appointment) => getAppointmentStatus(appointment) === "scheduled")
      .map((appointment) => `${normalizeSlotDate(appointment.slotDate)}|${appointment.slotTime}`)
  );

  const output = Array.from({ length: days }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const isoDate = date.toISOString().slice(0, 10);
    const schedule = availability.weeklySchedule.find((item) => item.dayOfWeek === date.getDay());
    const slots = doctor.available && availability.enabled
      ? (schedule?.slots ?? []).filter(
          (slot) => !booked.has(`${isoDate}|${slot}`) && isFutureSlot(isoDate, slot)
        )
      : [];
    return { date: isoDate, slots };
  });

  return {
    timezone: availability.timezone,
    consultationDurationMinutes: availability.consultationDurationMinutes,
    days: output
  };
};
