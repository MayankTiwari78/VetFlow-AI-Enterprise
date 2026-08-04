import { AppError } from "./AppError.js";

export const parseJsonField = <T>(value: unknown, fieldName: string): T => {
  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new AppError(`${fieldName} must be valid JSON`, 400);
  }
};
