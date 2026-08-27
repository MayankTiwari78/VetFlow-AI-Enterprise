import { Router } from "express";

import {
  predictAiReport,
  predictAndSaveAiReport
} from "../controllers/aiMlController.js";
import {
  predictAiImageReport,
  predictAndSaveAiImageReport
} from "../controllers/cvImageController.js";
import {
  combinedAssessmentPredict,
  combinedAssessmentSave
} from "../controllers/combinedAssessmentController.js";
import { authAny } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  aiPredictionSchema,
  combinedAssessmentSchema,
  cvImagePredictionSchema
} from "../validators/aiMlValidators.js";

const aiMlRouter = Router();

aiMlRouter.post(
  "/predict",
  authAny,
  validateRequest({ body: aiPredictionSchema }),
  predictAiReport
);
aiMlRouter.post(
  "/predict-and-save",
  authAny,
  validateRequest({ body: aiPredictionSchema }),
  predictAndSaveAiReport
);

// Stage 2C AI image assessment (multipart/form-data; field name: "image").
// Preliminary image-based screening only — never stored as a diagnosis.
aiMlRouter.post(
  "/predict-image",
  authAny,
  upload.single("image"),
  validateRequest({ body: cvImagePredictionSchema }),
  predictAiImageReport
);
// Persist a successful image assessment into the shared AI Health Reports
// history so it can be listed/detailed and reviewed by a veterinarian.
aiMlRouter.post(
  "/predict-image-and-save",
  authAny,
  upload.single("image"),
  validateRequest({ body: cvImagePredictionSchema }),
  predictAndSaveAiImageReport
);

// Stage 3 combined assessment (JSON): fuses symptom ML + saved image CV +
// pet-history into ONE deterministic preliminary assessment.
aiMlRouter.post(
  "/combined-assessment",
  authAny,
  validateRequest({ body: combinedAssessmentSchema }),
  combinedAssessmentPredict
);
aiMlRouter.post(
  "/combined-assessment-and-save",
  authAny,
  validateRequest({ body: combinedAssessmentSchema }),
  combinedAssessmentSave
);

export default aiMlRouter;