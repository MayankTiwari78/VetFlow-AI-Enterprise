import { z } from "zod";

import { addressInputSchema, appointmentIdBodySchema, objectIdSchema } from "./common.js";

export const doctorActionAppointmentSchema = appointmentIdBodySchema;

export const updateDoctorProfileSchema = z.object({
  fees: z.coerce.number().nonnegative(),
  address: addressInputSchema,
  available: z.coerce.boolean(),
  about: z.string().trim().min(1).max(5000).optional()
});

const timezoneSchema = z.string().trim().min(1).max(80).refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Invalid timezone");

const availabilityDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  slots: z
    .array(z.string().trim().regex(/^\d{2}:\d{2}$/, "Use 24-hour HH:mm slots"))
    .max(48)
    .transform((slots) => [...new Set(slots)].sort())
});

export const updateDoctorAvailabilitySchema = z
  .object({
    enabled: z.boolean(),
    timezone: timezoneSchema,
    consultationDurationMinutes: z.number().int().min(15).max(120),
    weeklySchedule: z.array(availabilityDaySchema).max(7)
  })
  .superRefine((value, context) => {
    const days = value.weeklySchedule.map((item) => item.dayOfWeek);
    if (new Set(days).size !== days.length) {
      context.addIssue({ code: "custom", message: "Each weekday can appear only once" });
    }
    if (value.enabled && !value.weeklySchedule.some((item) => item.slots.length > 0)) {
      context.addIssue({ code: "custom", message: "Add at least one available slot" });
    }
  });

export const availableSlotsParamsSchema = z.object({ doctorId: objectIdSchema });
export const availableSlotsQuerySchema = z.object({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(31).default(7)
});

export const clinicalNotesParamsSchema = z.object({ appointmentId: objectIdSchema });
export const updateClinicalNotesSchema = z.object({
  clinicalNotes: z.string().trim().max(5000)
});
