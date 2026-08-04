import { z } from "zod";

import { PASSWORD_POLICY_MESSAGE } from "../constants/auth.js";
import { isValidObjectId } from "../utils/objectId.js";

export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => isValidObjectId(value), "Invalid ObjectId");

export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, PASSWORD_POLICY_MESSAGE)
  .regex(/[a-z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/[A-Z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/\d/, PASSWORD_POLICY_MESSAGE)
  .regex(/[^A-Za-z0-9]/, PASSWORD_POLICY_MESSAGE);

export const addressSchema = z.object({
  line1: z.string().trim().max(200).default(""),
  line2: z.string().trim().max(200).default("")
});

export const addressInputSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, addressSchema);

export const appointmentIdBodySchema = z.object({
  appointmentId: objectIdSchema
});
