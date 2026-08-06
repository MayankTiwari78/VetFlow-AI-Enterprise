import http from "node:http";

import app from "./app.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { connectDB, disconnectDB } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

let server: http.Server | undefined;

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ event: "server.shutdown", signal }, "Shutting down server");

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
  }

  await disconnectDB().catch(() => undefined);
  process.exit(0);
};

const start = async (): Promise<void> => {
  configureCloudinary();
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info({ event: "server.started", port: env.PORT }, "Server started");
  });
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ event: "process.unhandled_rejection", reason }, "Unhandled promise rejection");
  void shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ event: "process.uncaught_exception", err: error }, "Uncaught exception");
  void shutdown("uncaughtException");
});

start().catch((error: unknown) => {
  logger.fatal(
    { event: "mongodb.startup_failed", err: error instanceof Error ? error : undefined },
    error instanceof Error ? error.message : "Database startup connection failed"
  );
  process.exit(1);
});
