import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDB = async (): Promise<void> => {
  mongoose.connection.on("connected", () => {
    logger.info({ event: "mongodb.connected" }, "Database connected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error({ event: "mongodb.error", err: error }, "Database connection error");
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: env.isTest ? 500 : 10000
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info({ event: "mongodb.disconnected" }, "Database disconnected");
};

export const isDatabaseReady = (): boolean => Number(mongoose.connection.readyState) === 1;
