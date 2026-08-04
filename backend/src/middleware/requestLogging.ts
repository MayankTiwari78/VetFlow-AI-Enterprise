import crypto from "node:crypto";

import type { Request, Response } from "express";
import { pinoHttp } from "pino-http";

import { logger } from "../utils/logger.js";

const headerValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
};

export const requestLogger = pinoHttp<Request, Response>({
  logger,
  genReqId: (req, res) => {
    const requestId = headerValue(req.headers["x-request-id"]) ?? crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps: (req) => ({
    requestId: req.requestId
  }),
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) {
      return "error";
    }

    if (res.statusCode >= 400) {
      return "warn";
    }

    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${req.method ?? "HTTP"} ${req.url ?? ""} completed with ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method ?? "HTTP"} ${req.url ?? ""} failed with ${res.statusCode}`,
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/ready" || req.url === "/api/health"
  }
});
