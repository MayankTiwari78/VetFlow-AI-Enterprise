import { z } from "zod";

import {
  addressInputSchema,
  appointmentIdBodySchema,
  emailSchema,
  objectIdSchema,
  passwordSchema
} from "./common.js";

export const addDoctorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  speciality: z.string().trim().min(1).max(120),
  degree: z.string().trim().min(1).max(120),
  experience: z.string().trim().min(1).max(80),
  about: z.string().trim().min(1).max(5000),
  fees: z.coerce.number().positive(),
  address: addressInputSchema
});

export const adminCancelAppointmentSchema = appointmentIdBodySchema;

export const changeAvailabilitySchema = z.object({
  docId: objectIdSchema
});

export const patientDirectoryQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["ALL", "ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "DISABLED"]).default("ALL")
});

export const patientParamsSchema = z.object({ patientId: objectIdSchema });
export const adminAppointmentParamsSchema = z.object({ appointmentId: objectIdSchema });
export const adminAppointmentStatusSchema = z.object({
  status: z.enum(["completed", "cancelled"])
});
