import { z } from "zod";

import { objectIdSchema } from "./common.js";

const symptomValueSchema = z
  .number()
  .int()
  .min(0)
  .max(3)
  .describe("Symptom severity 0-3");

export const aiPredictionSchema = z.object({
  petId: objectIdSchema,
  symptoms: z
    .object({
      Fever: symptomValueSchema,
      Cough: symptomValueSchema,
      Diarrhea: symptomValueSchema,
      Lethargy: symptomValueSchema,
      Loss_of_Appetite: symptomValueSchema
    })
    .strict()
});

export const aiPredictionSaveSchema = aiPredictionSchema;

/**
 * Stage 2C AI image assessment (multipart/form-data).
 * petId arrives as a form field alongside the uploaded file.
 */
export const cvImagePredictionSchema = z.object({
  petId: objectIdSchema
});

/**
 * Stage 3 combined assessment request (JSON).
 * At least one of `symptoms` or `imageReportId` must be present (enforced in
 * the controller so the error is explicit and localized).
 */
export const combinedAssessmentSchema = z.object({
  petId: objectIdSchema,
  symptoms: z
    .object({
      Fever: symptomValueSchema,
      Cough: symptomValueSchema,
      Diarrhea: symptomValueSchema,
      Lethargy: symptomValueSchema,
      Loss_of_Appetite: symptomValueSchema
    })
    .strict()
    .optional(),
  imageReportId: objectIdSchema.optional()
});