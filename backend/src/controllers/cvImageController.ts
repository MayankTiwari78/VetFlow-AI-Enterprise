import type { Request } from "express";
import type { RequestHandler } from "express";

import type { VeterinaryActor } from "../services/aiMlService.js";
import {
  runAiImagePrediction,
  saveAiImageReport,
  type CvImagePredictionPayload
} from "../services/cvImageService.js";
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

/**
 * Stage 2C AI image assessment (preliminary, never a diagnosis).
 * Returns the Stage 2C structured contract unchanged.
 */
export const predictAiImageReport: RequestHandler = asyncHandler(async (req, res) => {
  const petId = typeof req.body?.petId === "string" ? req.body.petId.trim() : "";
  const file = req.file;

  if (!file) {
    throw new AppError(
      "An image file is required for AI image assessment (field name: 'image')",
      400
    );
  }

  const prediction = await runAiImagePrediction(veterinaryActorFromRequest(req), {
    petId,
    file
  } as CvImagePredictionPayload);

  sendSuccess(res, 200, "Preliminary AI image assessment generated", { prediction });
});

/**
 * Stage 2C AI image assessment persisted to the shared AI report store so it
 * appears in the existing AI Health Reports history + veterinarian review.
 */
export const predictAndSaveAiImageReport: RequestHandler = asyncHandler(async (req, res) => {
  const petId = typeof req.body?.petId === "string" ? req.body.petId.trim() : "";
  const file = req.file;

  if (!file) {
    throw new AppError(
      "An image file is required for AI image assessment (field name: 'image')",
      400
    );
  }

  const actor = veterinaryActorFromRequest(req);
  const payload = { petId, file } as CvImagePredictionPayload;
  const prediction = await runAiImagePrediction(actor, payload);
  const report = await saveAiImageReport(actor, payload, prediction);

  sendSuccess(res, 201, "Preliminary AI image assessment saved to history", {
    report: report.toObject ? report.toObject() : report
  });
});