import { Router } from "express";

import { predictAiReport, predictAndSaveAiReport } from "../controllers/aiMlController.js";
import { authAny } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { aiPredictionSchema } from "../validators/aiMlValidators.js";

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

export default aiMlRouter;