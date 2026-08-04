import { z } from "zod";

import { MEDICAL_RECORD_TYPES } from "../models/MedicalRecord.js";
import { objectIdSchema } from "./common.js";

const boundedText = (max: number) => z.string().trim().min(1).max(max);

const medicationSchema = z.object({
  name: boundedText(120),
  dosage: boundedText(80),
  frequency: boundedText(80),
  duration: boundedText(80),
  instructions: z.string().trim().max(500).default("")
});

const vaccineSchema = z.object({
  name: boundedText(120),
  administeredOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  batchNumber: z.string().trim().max(120).optional(),
  nextDueOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const reportMetadataSchema = z.object({
  fileName: boundedText(180),
  fileType: z.string().trim().max(120).optional(),
  fileSizeBytes: z.number().int().nonnegative().max(25 * 1024 * 1024).optional(),
  storageStatus: z.enum(["storage_not_configured", "metadata_only"]).default("metadata_only")
});

const detailsSchema = z
  .object({
    diagnosis: z.string().trim().max(800).optional(),
    plan: z.string().trim().max(1500).optional(),
    medicines: z.array(medicationSchema).max(12).optional(),
    vaccine: vaccineSchema.optional(),
    report: reportMetadataSchema.optional(),
    notes: z.string().trim().max(1500).optional()
  })
  .strict()
  .default({});

export const medicalRecordCreateSchema = z.object({
  patientId: objectIdSchema.optional(),
  type: z.enum(MEDICAL_RECORD_TYPES),
  title: boundedText(180),
  summary: boundedText(2000),
  details: detailsSchema,
  patientVisible: z.boolean().default(true),
  status: z.enum(["draft", "finalized"]).default("draft")
});

export const medicalRecordUpdateSchema = z.object({
  title: boundedText(180).optional(),
  summary: boundedText(2000).optional(),
  details: detailsSchema.optional(),
  patientVisible: z.boolean().optional(),
  status: z.enum(["draft", "finalized"]).optional()
});

export const medicalRecordQuerySchema = z.object({
  type: z.enum(MEDICAL_RECORD_TYPES).optional(),
  status: z.enum(["draft", "finalized"]).optional(),
  patientId: objectIdSchema.optional(),
  dateFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const appointmentMedicalRecordParamsSchema = z.object({
  appointmentId: objectIdSchema
});

export const patientMedicalRecordParamsSchema = z.object({
  patientId: objectIdSchema
});

export const medicalRecordParamsSchema = z.object({
  recordId: objectIdSchema
});

export const healthCardLookupParamsSchema = z.object({
  lookupId: z.string().trim().min(16).max(160).regex(/^[A-Za-z0-9_-]+$/)
});
