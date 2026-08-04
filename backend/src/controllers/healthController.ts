import type { RequestHandler } from "express";

import { isDatabaseReady } from "../config/database.js";

export const health: RequestHandler = (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API healthy",
    data: {
      status: "ok",
      uptime: process.uptime()
    }
  });
};

export const readiness: RequestHandler = (_req, res) => {
  const ready = isDatabaseReady();

  res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? "API ready" : "API not ready",
    data: {
      database: ready ? "connected" : "disconnected"
    }
  });
};
