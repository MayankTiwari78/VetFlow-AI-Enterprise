import type { Request } from "express";
import type { RequestHandler } from "express";

import {
  runAiPrediction,
  saveAiReportFromPrediction,
  type AiPredictionPayload,
  type VeterinaryActor
} from "../services/aiMlService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

const veterinaryActorFromRequest = (req: Request): VeterinaryActor => {
  if (!req.authAccountId || !req.authAccountType || !req.authRole || !req.authPermissions) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  return {
    accountId: req.authAccountId,
    accountType: req.authAccountType,
    role: req.authRole,
    permissions: req.authPermissions
  };
};

export const predictAiReport: RequestHandler = asyncHandler(async (req, res) => {
  const prediction = await runAiPrediction(
    veterinaryActorFromRequest(req),
    req.body as AiPredictionPayload
  );
  sendSuccess(res, 200, "Preliminary AI assessment generated", { prediction });
});

export const predictAndSaveAiReport: RequestHandler = asyncHandler(async (req, res) => {
  const actor = veterinaryActorFromRequest(req);
  const payload = req.body as AiPredictionPayload;
  const prediction = await runAiPrediction(actor, payload);
  const report = await saveAiReportFromPrediction(actor, payload, prediction);
  sendSuccess(res, 201, "Preliminary AI assessment report created", { report });
});