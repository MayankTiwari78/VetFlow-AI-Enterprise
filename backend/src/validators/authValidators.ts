import { z } from "zod";

import { AUTH_CHALLENGE_PURPOSES } from "../constants/auth.js";
import { emailSchema, passwordSchema } from "./common.js";

export const registerUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional()
  })
  .superRefine((value, context) => {
    if (value.confirmPassword !== undefined && value.confirmPassword !== value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password confirmation does not match"
      });
    }
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

export const adminLoginSchema = loginSchema;

export const unifiedLoginSchema = loginSchema.extend({
  accountType: z.enum(["patient", "doctor", "admin"]).default("patient")
});

export const emptyBodySchema = z.object({}).strip();

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(16, "Verification token is required")
});

export const resendVerificationSchema = z.object({
  email: emailSchema
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16, "Password reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().optional()
  })
  .superRefine((value, context) => {
    if (value.confirmPassword !== undefined && value.confirmPassword !== value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password confirmation does not match"
      });
    }
  });

export const requestOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(AUTH_CHALLENGE_PURPOSES)
});

export const verifyOtpSchema = requestOtpSchema.extend({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits")
});
