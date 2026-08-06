import dns from "node:dns";

import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let connectionPromise: Promise<void> | undefined;
let listenersAttached = false;
const mongoDnsServers = ["1.1.1.1", "1.0.0.1"];

export const connectDB = async (): Promise<void> => {
  if (Number(mongoose.connection.readyState) === 1) {
    return;
  }

  if (!listenersAttached) {
    mongoose.connection.on("connected", () => {
      logger.info({ event: "mongodb.connected" }, "Database connected");
    });

    mongoose.connection.on("error", (error) => {
      logger.error({ event: "mongodb.error", err: error }, "Database connection error");
    });

    listenersAttached = true;
  }

  dns.setServers(mongoDnsServers);

  connectionPromise ??= mongoose
    .connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: env.isTest ? 500 : 10000
    })
    .then(() => undefined)
    .catch((error: unknown) => {
      connectionPromise = undefined;
      throw error;
    });

  await connectionPromise;
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info({ event: "mongodb.disconnected" }, "Database disconnected");
};

export const isDatabaseReady = (): boolean => Number(mongoose.connection.readyState) === 1;
