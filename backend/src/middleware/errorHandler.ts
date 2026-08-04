import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

const isMongoDuplicateError = (error: unknown): error is MongoServerError =>
  Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as MongoServerError).code === 11000
  );

const formatZodErrors = (error: ZodError): string[] =>
  error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`);

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  void next;

  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown[] = [];

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.errors;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = formatZodErrors(error);
  } else if (error instanceof MulterError) {
    statusCode = 400;
    message =
      error.code === "LIMIT_FILE_SIZE" ? "Uploaded image is too large" : "Invalid file upload";
    errors = [error.message];
  } else if (isMongoDuplicateError(error)) {
    statusCode = 409;
    const duplicateField = Object.keys(error.keyValue ?? {})[0] ?? "field";
    message = `${duplicateField} already exists`;
  } else if (error instanceof SyntaxError && "body" in error) {
    statusCode = 400;
    message = "Malformed JSON request body";
  } else if (error instanceof Error && env.isDevelopment) {
    message = error.message;
  }

  if (!(error instanceof AppError)) {
    logger.error(
      {
        err: error,
        requestId: req.requestId,
        statusCode,
        path: req.path,
        method: req.method
      },
      "Unhandled request error"
    );
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    requestId: req.requestId,
    ...(env.isDevelopment && error instanceof Error ? { stack: error.stack } : {})
  });
};
