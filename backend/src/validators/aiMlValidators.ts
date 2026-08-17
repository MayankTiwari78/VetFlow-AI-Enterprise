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