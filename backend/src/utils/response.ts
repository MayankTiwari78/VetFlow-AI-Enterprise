import type { Response } from "express";

type JsonObject = Record<string, unknown>;

export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown,
  legacyFields: JsonObject = {}
): Response => {
  const body: JsonObject = {
    success: true,
    message,
    ...legacyFields
  };

  if (data !== undefined) {
    body.data = data;
  }

  return res.status(statusCode).json(body);
};
