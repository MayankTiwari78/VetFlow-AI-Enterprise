import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validateRequest =
  (schemas: RequestSchemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.body) {
      const parsedBody = schemas.body.parse(req.body) as unknown;
      req.body = parsedBody;
    }

    if (schemas.query) {
      const parsedQuery = schemas.query.parse(req.query) as typeof req.query;
      req.query = parsedQuery;
    }

    if (schemas.params) {
      const parsedParams = schemas.params.parse(req.params) as typeof req.params;
      req.params = parsedParams;
    }

    next();
  };
