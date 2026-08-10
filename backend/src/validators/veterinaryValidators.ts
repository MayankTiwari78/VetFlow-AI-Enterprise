import { z } from "zod";

import { AI_REPORT_SEVERITIES } from "../models/AIReport.js";
import { addressInputSchema, objectIdSchema } from "./common.js";

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const textListSchema = z
  .array(z.string().trim().min(1).max(160))
  .max(50)
  .default([])
  .transform((items) => [...new Set(items)]);
const optionalDateSchema = z.coerce.date().optional();
const sortSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^-?[A-Za-z][A-Za-z0-9_]*$/, "Invalid sort field")
  .default("-createdAt");

const atLeastOneField = (value: Record<string, unknown>) => Object.values(value).some(
  (item) => item !== undefined
);

export const veterinaryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).default(""),
  sort: sortSchema
});

export const veterinaryTargetQuerySchema = z.object({
  ownerId: objectIdSchema.optional(),
  userId: objectIdSchema.optional()
});

export const ownerIdQuerySchema = veterinaryListQuerySchema.extend({
  ownerId: objectIdSchema.optional(),
  species: z.string().trim().max(80).optional(),
  breed: z.string().trim().max(120).optional(),
  age: z.coerce.number().nonnegative().optional(),
  minAge: z.coerce.number().nonnegative().optional(),
  maxAge: z.coerce.number().nonnegative().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  minWeight: z.coerce.number().nonnegative().optional(),
  maxWeight: z.coerce.number().nonnegative().optional()
});

export const petOwnerCreateSchema = z.object({
  userId: objectIdSchema.optional(),
  phone: z.string().trim().max(40).default(""),
  address: addressInputSchema.default({ line1: "", line2: "" }),
  emergencyContact: z.string().trim().max(120).default(""),
  emergencyPhone: z.string().trim().max(40).default("")
});

export const petOwnerUpdateSchema = petOwnerCreateSchema
  .omit({ userId: true })
  .partial()
  .refine(atLeastOneField, "Provide at least one field to update");

export const petCreateSchema = z.object({
  ownerId: objectIdSchema.optional(),
  name: boundedText(120),
  species: boundedText(80),
  breed: z.string().trim().max(120).default(""),
  gender: z.string().trim().max(40).default("Not Selected"),
  age: z.coerce.number().nonnegative().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  color: z.string().trim().max(80).default(""),
  dateOfBirth: optionalDateSchema,
  microchipNumber: optionalText(80),
  vaccinationStatus: z.string().trim().max(80).default("unknown"),
  allergies: textListSchema,
  medicalHistory: textListSchema,
  profileImage: z.string().trim().max(2000).default("")
});

export const petUpdateSchema = petCreateSchema
  .partial()
  .refine(atLeastOneField, "Provide at least one field to update");

const availabilityDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  slots: z
    .array(z.string().trim().regex(/^\d{2}:\d{2}$/, "Use 24-hour HH:mm slots"))
    .max(48)
    .default([])
    .transform((slots) => [...new Set(slots)].sort())
});

const availabilitySchema = z
  .object({
    enabled: z.boolean().default(true),
    timezone: z.string().trim().min(1).max(80).default("Asia/Kolkata"),
    consultationDurationMinutes: z.number().int().min(15).max(120).default(30),
    weeklySchedule: z.array(availabilityDaySchema).max(7).default([])
  })
  .superRefine((value, context) => {
    const days = value.weeklySchedule.map((item) => item.dayOfWeek);
    if (new Set(days).size !== days.length) {
      context.addIssue({ code: "custom", message: "Each weekday can appear only once" });
    }
  });

export const veterinarianCreateSchema = z.object({
  doctorId: objectIdSchema,
  specialization: textListSchema,
  clinicName: boundedText(180),
  yearsOfExperience: z.coerce.number().int().nonnegative(),
  licenseNumber: boundedText(120),
  consultationFee: z.coerce.number().nonnegative(),
  availability: availabilitySchema.default({})
});

export const veterinarianUpdateSchema = veterinarianCreateSchema
  .omit({ doctorId: true })
  .partial()
  .refine(atLeastOneField, "Provide at least one field to update");

export const vaccinationCreateSchema = z.object({
  petId: objectIdSchema,
  vaccineName: boundedText(160),
  category: z.string().trim().max(80).default("Core"),
  dueDate: z.coerce.date(),
  completedDate: optionalDateSchema,
  nextDose: optionalDateSchema,
  dose: z.string().trim().max(80).default(""),
  route: z.string().trim().max(80).default(""),
  veterinarian: objectIdSchema.optional(),
  clinic: z.string().trim().max(180).default(""),
  manufacturer: z.string().trim().max(160).default(""),
  batchNumber: z.string().trim().max(120).default(""),
  certificate: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(2000).default(""),
  status: z.enum(["up-to-date", "due-soon", "overdue", "completed", "cancelled"]).default("up-to-date")
});

export const vaccinationUpdateSchema = vaccinationCreateSchema
  .omit({ petId: true })
  .partial()
  .refine(atLeastOneField, "Provide at least one field to update");

const medicationSchema = z.object({
  name: boundedText(120),
  dosage: boundedText(80),
  frequency: boundedText(80),
  duration: boundedText(80),
  instructions: z.string().trim().max(500).optional()
});

const prescriptionSchema = z.object({
  medicationName: boundedText(120),
  dosage: boundedText(80),
  frequency: boundedText(80),
  duration: boundedText(80),
  instructions: z.string().trim().max(500).optional()
});

const laboratoryReportSchema = z.object({
  title: boundedText(180),
  reportType: z.string().trim().max(120).optional(),
  result: z.string().trim().max(2000).optional(),
  fileUrl: z.string().trim().max(2000).optional(),
  uploadedAt: optionalDateSchema
});

const attachmentSchema = z.object({
  fileName: boundedText(180),
  fileUrl: boundedText(2000),
  fileType: z.string().trim().max(120).optional(),
  uploadedAt: optionalDateSchema
});

export const petMedicalRecordCreateSchema = z.object({
  petId: objectIdSchema,
  veterinarianId: objectIdSchema.optional(),
  diagnosis: boundedText(2000),
  symptoms: textListSchema,
  medications: z.array(medicationSchema).max(30).default([]),
  prescriptions: z.array(prescriptionSchema).max(30).default([]),
  treatment: boundedText(5000),
  laboratoryReports: z.array(laboratoryReportSchema).max(30).default([]),
  attachments: z.array(attachmentSchema).max(30).default([]),
  visitDate: z.coerce.date().default(() => new Date()),
  followUpDate: optionalDateSchema
});

export const petMedicalRecordUpdateSchema = petMedicalRecordCreateSchema
  .omit({ petId: true, veterinarianId: true })
  .partial()
  .refine(atLeastOneField, "Provide at least one field to update");

export const aiReportCreateSchema = z.object({
  petId: objectIdSchema,
  symptoms: textListSchema,
  uploadedImages: z.array(z.string().trim().max(2000)).max(20).default([]),
  aiSummary: boundedText(4000),
  possibleConditions: textListSchema,
  severity: z.enum(AI_REPORT_SEVERITIES),
  recommendations: textListSchema,
  generatedAt: z.coerce.date().default(() => new Date())
});

export const aiReportQuerySchema = veterinaryListQuerySchema.extend({
  petId: objectIdSchema.optional()
});

export const petOwnerSearchQuerySchema = veterinaryListQuerySchema.extend({
  userId: objectIdSchema.optional()
});

export const vaccinationQuerySchema = veterinaryListQuerySchema;

export const petMedicalRecordQuerySchema = veterinaryListQuerySchema;

export const petIdParamSchema = z.object({ petId: objectIdSchema });
export const veterinarianIdParamSchema = z.object({ veterinarianId: objectIdSchema });
export const vaccinationIdParamSchema = z.object({ vaccinationId: objectIdSchema });
export const petMedicalRecordIdParamSchema = z.object({ recordId: objectIdSchema });
export const aiReportIdParamSchema = z.object({ reportId: objectIdSchema });
