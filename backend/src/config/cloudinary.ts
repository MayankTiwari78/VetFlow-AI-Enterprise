import { v2 as cloudinary } from "cloudinary";

import { env } from "./env.js";

export const CLOUDINARY_CONFIGURATION_ERROR =
  "Cloudinary credentials are not configured. Set valid CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_SECRET_KEY.";

const isConfiguredCredential = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    Boolean(normalized) &&
    normalized !== "placeholder" &&
    !normalized.startsWith("replace-with-") &&
    !normalized.includes("replace_with")
  );
};

export const hasValidCloudinaryCredentials = (): boolean =>
  [env.CLOUDINARY_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_SECRET_KEY].every(
    isConfiguredCredential
  );

export const configureCloudinary = (): void => {
  if (!hasValidCloudinaryCredentials()) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        `Invalid backend environment configuration: ${CLOUDINARY_CONFIGURATION_ERROR}`
      );
    }

    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_SECRET_KEY,
    secure: true
  });
};

export { cloudinary };
