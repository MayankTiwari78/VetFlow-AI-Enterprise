import type { Appointment } from "../models/Appointment.js";

type ObjectLike = Record<string, unknown> & { toObject?: () => Record<string, unknown> };

const toPlain = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {};
  const candidate = value as ObjectLike;
  return typeof candidate.toObject === "function" ? candidate.toObject() : { ...candidate };
};

export const normalizeSlotDate = (value: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [day, month, year] = value.split("_").map(Number);
  if (!day || !month || !year) return value;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
};

export const localSlotDateTime = (slotDate: string, slotTime: string): Date =>
  new Date(`${normalizeSlotDate(slotDate)}T${slotTime}:00`);

export const isFutureSlot = (slotDate: string, slotTime: string, now = new Date()): boolean => {
  const date = localSlotDateTime(slotDate, slotTime);
  return !Number.isNaN(date.getTime()) && date.getTime() > now.getTime();
};

export const getAppointmentStatus = (
  appointment: Pick<Appointment, "status" | "cancelled" | "isCompleted">
): Appointment["status"] => {
  if (appointment.status) return appointment.status;
  if (appointment.cancelled) return "cancelled";
  if (appointment.isCompleted) return "completed";
  return "scheduled";
};

const stripPrivateHealthSnapshot = (userData: unknown): Record<string, unknown> => {
  const safe = toPlain(userData);
  delete safe.healthProfile;
  delete safe.medicalNotes;
  delete safe.allergies;
  delete safe.chronicConditions;
  delete safe.insurance;
  delete safe.emergencyContact;
  return safe;
};

export const sanitizeAppointmentForPatient = (appointment: unknown): Record<string, unknown> => {
  const safe = toPlain(appointment);
  delete safe.clinicalNotes;
  delete safe.clinicalNotesUpdatedAt;
  delete safe.patientSummary;
  safe.userData = stripPrivateHealthSnapshot(safe.userData);
  safe.status = getAppointmentStatus(safe as unknown as Appointment);
  return safe;
};

export const sanitizeAppointmentForAdmin = (appointment: unknown): Record<string, unknown> => {
  const safe = sanitizeAppointmentForPatient(appointment);
  delete safe.patientSummary;
  return safe;
};
