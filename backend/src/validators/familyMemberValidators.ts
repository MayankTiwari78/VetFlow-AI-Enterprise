import { z } from "zod";

import { objectIdSchema } from "./common.js";

export const familyMemberCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  relationship: z.string().trim().min(1).max(80),
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(160).optional(),
  emergencyContact: z.boolean().default(false)
});

export const familyMemberParamsSchema = z.object({
  familyMemberId: objectIdSchema
});
