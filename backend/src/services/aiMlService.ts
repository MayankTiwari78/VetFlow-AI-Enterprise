import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";
import AIReportModel from "../models/AIReport.js";
import PetModel from "../models/Pet.js";
import { AppError } from "../utils/AppError.js";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_SCRIPT = path.resolve(__dirname, "../../ml/ai_predict.py");

export interface VeterinaryActor {
  accountId: string;
  accountType: AccountType;
  role: EnterpriseRole;
  permissions: Permission[];
}

export interface SymptomInput {
  Fever: number;
  Cough: number;
  Diarrhea: number;
  Lethargy: number;
  Loss_of_Appetite: number;
}

export interface AiPredictionPayload {
  petId: string;
  symptoms: SymptomInput;
}

const isAdmin = (actor: VeterinaryActor): boolean =>
  actor.accountType === "admin" || actor.role === "SUPER_ADMIN" || actor.role === "HOSPITAL_ADMIN";

const hasPermission = (actor: VeterinaryActor, permission: Permission): boolean =>
  actor.permissions.includes(permission);

const requireAnyPermission = (actor: VeterinaryActor, permissions: Permission[]): void => {
  if (permissions.some((permission) => hasPermission(actor, permission))) {
    return;
  }
  throw new AppError("Forbidden", 403);
};

const assertPetAccess = async (actor: VeterinaryActor, petId: string): Promise<void> => {
  const pet = await PetModel.findById(petId);
  if (!pet) {
    throw new AppError("Pet not found", 404);
  }
  if (isAdmin(actor)) {
    return;
  }
  if (actor.accountType === "patient") {
    requireAnyPermission(actor, ["users:manage"]);
    return;
  }
  throw new AppError("Pet not found", 404);
};

export { assertPetAccess };

const runPythonPrediction = async (symptoms: SymptomInput): Promise<Record<string, unknown>> => {
  const input = JSON.stringify({ symptoms });
  const command = `python "${ML_SCRIPT}" "${input.replace(/"/g, '\\"')}"`;
  const { stdout } = await execAsync(command, {
    maxBuffer: 1024 * 1024,
    timeout: 30_000
  });
  const parsed = JSON.parse(stdout) as { success: boolean; data?: Record<string, unknown>; error?: string };
  if (!parsed.success) {
    throw new AppError(parsed.error ?? "ML prediction failed", 422);
  }
  return parsed.data ?? {};
};

export const runAiPrediction = async (
  actor: VeterinaryActor,
  payload: AiPredictionPayload
): Promise<Record<string, unknown>> => {
  requireAnyPermission(actor, ["users:manage", "appointments:update"]);
  await assertPetAccess(actor, payload.petId);
  return runPythonPrediction(payload.symptoms);
};

export const saveAiReportFromPrediction = async (
  actor: VeterinaryActor,
  payload: AiPredictionPayload,
  prediction: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  requireAnyPermission(actor, ["users:manage", "appointments:update"]);
  await assertPetAccess(actor, payload.petId);

  const topPredictions = (prediction.topPredictions as Array<{ condition: string; probability: number }>) ?? [];
  const possibleConditions = topPredictions.map((item) => item.condition);
  const probabilities = (prediction.probabilities as Record<string, number>) ?? {};
  const topCondition = topPredictions[0]?.condition ?? "Unknown";
  const topProbability = topPredictions[0]?.probability ?? 0;
  const confidenceLevel = String(prediction.confidenceLevel ?? "Low");
  const severity = confidenceLevel === "High" ? "high" : confidenceLevel === "Moderate" ? "moderate" : "low";

  const aiSummary =
    `Preliminary AI assessment for ${topCondition} with model confidence ${confidenceLevel} ` +
    `(probability ${(topProbability * 100).toFixed(1)}%). ` +
    `This is a statistical model association, not a clinical diagnosis. ` +
    `Veterinarian review is required.`;

  const report = await new AIReportModel({
    petId: payload.petId,
    symptoms: Object.entries(payload.symptoms)
      .filter(([, value]) => value > 0)
      .map(([key]) => key),
    uploadedImages: [],
    aiSummary,
    possibleConditions,
    severity,
    recommendations: [
      "Veterinarian review is required before any treatment decision.",
      "This is a preliminary AI assessment, not a clinical diagnosis."
    ],
    generatedAt: new Date(),
    veterinarianReviewStatus: "pending",
    modelVersion: String(prediction.modelVersion ?? "vetflow-ml-v1.1.0-dev"),
    contractVersion: "1.0.0",
    prediction: {
      predictedCondition: String(prediction.predictedCondition ?? topCondition),
      modelProbability: Number(prediction.modelProbability ?? topProbability),
      confidenceLevel,
      topPredictions,
      probabilities,
      explanation: prediction.explanation ?? {}
    }
  }).save();

  return report.toObject() as unknown as Record<string, unknown>;
};
