import express from "express";

import { health, readiness } from "./controllers/healthController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogging.js";
import { corsMiddleware, generalRateLimiter, helmetMiddleware } from "./middleware/security.js";
import { registerOpenApiRoutes } from "./openapi/routes.js";
import apiRouter from "./routes/index.js";

const app = express();

app.set("trust proxy", 1);

app.use(requestLogger);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(generalRateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (_req, res) => {
  res.status(200).send("API Working");
});

app.get("/health", health);
app.get("/ready", readiness);
registerOpenApiRoutes(app);
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
