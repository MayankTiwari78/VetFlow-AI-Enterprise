import fs from "node:fs/promises";

import {
  CLOUDINARY_CONFIGURATION_ERROR,
  cloudinary,
  hasValidCloudinaryCredentials
} from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

type UploadImageOptions = {
  developmentFallbackUrl?: string;
};

export const uploadImageToCloudinary = async (
  filePath: string,
  options: UploadImageOptions = {}
): Promise<string> => {
  try {
    if (!hasValidCloudinaryCredentials()) {
      if (env.NODE_ENV !== "production" && options.developmentFallbackUrl) {
        return options.developmentFallbackUrl;
      }

      throw new AppError(CLOUDINARY_CONFIGURATION_ERROR, 500);
    }

    const upload = await cloudinary.uploader.upload(filePath, { resource_type: "image" });
    return upload.secure_url;
  } finally {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
  }
};
