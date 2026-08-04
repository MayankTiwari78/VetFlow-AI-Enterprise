import { randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";

import multer from "multer";

import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from "../constants/defaults.js";
import { AppError } from "../utils/AppError.js";

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, os.tmpdir());
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError("Only image uploads are allowed", 400));
      return;
    }

    callback(null, true);
  }
});

export default upload;
