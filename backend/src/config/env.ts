import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase() === "true";
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().trim().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().trim().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_ACCESS_SECRET: z.string().trim().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().trim().min(16).optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().trim().min(1).default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().trim().min(1).default("30d"),
  JWT_ISSUER: z.string().trim().min(1).default("medflow-ai"),
  JWT_AUDIENCE: z.string().trim().min(1).default("medflow-ai-clients"),
  CLIENT_URL: z.string().trim().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().trim().url().default("http://localhost:3001"),
  ADMIN_EMAIL: z
    .string()
    .trim()
    .email("ADMIN_EMAIL must be a valid email")
    .transform((value) => value.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  CLOUDINARY_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_SECRET_KEY: z.string().trim().optional(),
  RAZORPAY_KEY_ID: z.string().trim().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().trim().min(1, "RAZORPAY_KEY_SECRET is required"),
  STRIPE_SECRET_KEY: z.string().trim().min(1, "STRIPE_SECRET_KEY is required"),
  CURRENCY: z.string().trim().min(3).max(3).default("INR"),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().trim().default("MedFlow AI <no-reply@localhost>"),
  EMAIL_VERIFICATION_EXPIRES_IN: z.string().trim().min(1).default("24h"),
  PASSWORD_RESET_EXPIRES_IN: z.string().trim().min(1).default("1h"),
  OTP_EXPIRES_IN: z.string().trim().min(1).default("10m"),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCK_DURATION: z.string().trim().min(1).default("15m"),
  COOKIE_NAME: z.string().trim().min(1).default("medflow_refresh"),
  PATIENT_COOKIE_NAME: z.string().trim().min(1).default("medflow_patient_refresh"),
  DOCTOR_COOKIE_NAME: z.string().trim().min(1).default("medflow_doctor_refresh"),
  ADMIN_COOKIE_NAME: z.string().trim().min(1).default("medflow_admin_refresh"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().trim().min(32).optional(),
  TOTP_ISSUER: z.string().trim().min(1).default("MedFlow AI Enterprise"),
  TOTP_SETUP_EXPIRES_IN: z.string().trim().min(1).default("10m"),
  TWO_FACTOR_CHALLENGE_EXPIRES_IN: z.string().trim().min(1).default("5m"),
  TWO_FACTOR_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RECOVERY_CODE_COUNT: z.coerce.number().int().positive().max(20).default(10),
  DEFAULT_ORGANIZATION_NAME: z.string().trim().min(1).default("MedFlow Default Hospital"),
  DEFAULT_ORGANIZATION_SLUG: z.string().trim().min(1).default("medflow-default"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SERVICE_NAME: z.string().trim().min(1).default("medflow-backend"),
  ENABLE_API_DOCS: booleanFromEnv.default(false),
  DEVELOPMENT_AUTO_VERIFY_EMAIL: z.string().default("false"),
  CV_PYTHON_PATH: z.string().trim().optional(),
  CV_STAGE2_ROOT: z.string().trim().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const messages = parsedEnv.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  throw new Error(`Invalid backend environment configuration: ${messages.join("; ")}`);
}

const isPlaceholderValue = (value: string | undefined): boolean => {
  const normalized = value?.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "placeholder" ||
    normalized.startsWith("replace-with-") ||
    normalized.includes("replace_with")
  );
};

const hasConfiguredValue = (value: string | undefined): boolean => !isPlaceholderValue(value);

const productionMissingFields = [
  ["JWT_ACCESS_SECRET", parsedEnv.data.JWT_ACCESS_SECRET],
  ["JWT_REFRESH_SECRET", parsedEnv.data.JWT_REFRESH_SECRET],
  ["SMTP_HOST", parsedEnv.data.SMTP_HOST],
  ["SMTP_USER", parsedEnv.data.SMTP_USER],
  ["SMTP_PASSWORD", parsedEnv.data.SMTP_PASSWORD],
  ["EMAIL_FROM", parsedEnv.data.EMAIL_FROM],
  ["TWO_FACTOR_ENCRYPTION_KEY", parsedEnv.data.TWO_FACTOR_ENCRYPTION_KEY]
].filter(([, value]) => !value);

if (parsedEnv.data.NODE_ENV === "production" && productionMissingFields.length > 0) {
  throw new Error(
    `Invalid backend environment configuration: production requires ${productionMissingFields
      .map(([key]) => key)
      .join(", ")}`
  );
}

const productionInvalidCloudinaryFields = [
  ["CLOUDINARY_NAME", parsedEnv.data.CLOUDINARY_NAME],
  ["CLOUDINARY_API_KEY", parsedEnv.data.CLOUDINARY_API_KEY],
  ["CLOUDINARY_SECRET_KEY", parsedEnv.data.CLOUDINARY_SECRET_KEY]
].filter(([, value]) => !hasConfiguredValue(value));

if (parsedEnv.data.NODE_ENV === "production" && productionInvalidCloudinaryFields.length > 0) {
  throw new Error(
    `Invalid backend environment configuration: production requires valid ${productionInvalidCloudinaryFields
      .map(([key]) => key)
      .join(", ")}`
  );
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.JWT_ACCESS_SECRET === parsedEnv.data.JWT_REFRESH_SECRET
) {
  throw new Error(
    "Invalid backend environment configuration: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ"
  );
}

export const env = {
  ...parsedEnv.data,
  CLOUDINARY_NAME: parsedEnv.data.CLOUDINARY_NAME ?? "",
  CLOUDINARY_API_KEY: parsedEnv.data.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_SECRET_KEY: parsedEnv.data.CLOUDINARY_SECRET_KEY ?? "",
  JWT_ACCESS_SECRET: parsedEnv.data.JWT_ACCESS_SECRET ?? parsedEnv.data.JWT_SECRET,
  JWT_REFRESH_SECRET:
    parsedEnv.data.JWT_REFRESH_SECRET ?? `${parsedEnv.data.JWT_SECRET}-refresh-development-only`,
  SMTP_HOST: parsedEnv.data.SMTP_HOST ?? "",
  SMTP_USER: parsedEnv.data.SMTP_USER ?? "",
  SMTP_PASSWORD: parsedEnv.data.SMTP_PASSWORD ?? "",
  TWO_FACTOR_ENCRYPTION_KEY:
    parsedEnv.data.TWO_FACTOR_ENCRYPTION_KEY ??
    `${parsedEnv.data.JWT_REFRESH_SECRET ?? parsedEnv.data.JWT_SECRET}-two-factor-development-only`,
  isDevelopment: parsedEnv.data.NODE_ENV === "development",
  isTest: parsedEnv.data.NODE_ENV === "test",
  isProduction: parsedEnv.data.NODE_ENV === "production"
};

export type Env = typeof env;
