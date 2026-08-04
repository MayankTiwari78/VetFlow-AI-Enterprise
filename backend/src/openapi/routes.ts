import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

import { env } from "../config/env.js";
import { openApiDocument } from "./document.js";

export const registerOpenApiRoutes = (app: Express): void => {
  app.get("/api-docs.json", (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  if (env.isDevelopment || env.ENABLE_API_DOCS) {
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, {
        customSiteTitle: "MedFlow AI API Documentation"
      })
    );
  }
};
