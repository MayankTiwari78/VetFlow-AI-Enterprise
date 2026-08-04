import { z } from "zod";

import { addressInputSchema, appointmentIdBodySchema, objectIdSchema } from "./common.js";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(20),
  address: addressInputSchema,
  dob: z.string().trim().min(1).max(30),
  gender: z.enum(["Male", "Female", "Not Selected"]).or(z.string().trim().min(1).max(30))
});

export const bookAppointmentSchema = z.object({
  docId: objectIdSchema,
  slotDate: z
    .string()
    .trim()
    .regex(/^(?:\d{4}-\d{2}-\d{2}|\d{1,2}_\d{1,2}_\d{4})$/, "Invalid slot date"),
  slotTime: z.string().trim().regex(/^\d{2}:\d{2}$/, "Invalid slot time")
});

const optionalDateSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Invalid date");

const normalizedListSchema = z
  .array(z.string().trim().min(1).max(120))
  .max(30)
  .transform((items) => [...new Set(items)]);

export const updateHealthProfileSchema = z.object({
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth is required"),
  gender: z.enum(["Female", "Male", "Non-binary", "Prefer not to say", "Not Selected"]),
  bloodGroup: z.enum(["Not known", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  allergies: normalizedListSchema,
  chronicConditions: normalizedListSchema,
  medicalNotes: z.string().trim().max(2000),
  emergencyContact: z.object({
    name: z.string().trim().max(120),
    relationship: z.string().trim().max(80),
    phone: z.string().trim().max(20)
  }),
  insurance: z.object({
    provider: z.string().trim().max(160),
    policyNumber: z.string().trim().max(120),
    expiryDate: optionalDateSchema
  })
});

export const cancelAppointmentSchema = appointmentIdBodySchema;

export const paymentInitSchema = appointmentIdBodySchema;

export const verifyRazorpaySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1)
});

export const verifyStripeSchema = z.object({
  appointmentId: objectIdSchema,
  success: z.string().optional(),
  sessionId: z.string().trim().optional(),
  session_id: z.string().trim().optional()
});
