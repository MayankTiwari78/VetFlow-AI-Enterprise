import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { env } from "../config/env.js";
import { assertPetAccess, type VeterinaryActor } from "./aiMlService.js";
import { createAiReport } from "./veterinaryService.js";
import PetModel from "../models/Pet.js";
import { AppError } from "../utils/AppError.js";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Stage 2C veterinary computer-vision inference.
 *
 * The model logic is NOT duplicated here: this service shells out to the
 * Phase 2C bridge (`backend/ml/cv_predict_bridge.py`) which imports the
 * existing Stage 2C `HeadPredictor` implementation and returns the exact
 * Stage 2C structured contract:
 *
 *   modelModality, assessmentType, veterinarianReviewRequired,
 *   disclaimer, imageFindings, imageConfidence
 */

export const CV_SUPPORTED_SPECIES = ["dog", "cat", "cattle"] as const;
export type CvSupportedSpecies = (typeof CV_SUPPORTED_SPECIES)[number];

/** Production/default head per species (Stage 2C policy). */
export const SPECIES_TO_CV_HEAD: Record<CvSupportedSpecies, string> = {
  dog: "dog_derm_coarse",
  cat: "cat_derm",
  cattle: "cattle_lumpy"
};

const SPECIES_ALIASES: Record<string, CvSupportedSpecies> = {
  dog: "dog",
  dogs: "dog",
  canine: "dog",
  puppy: "dog",
  cat: "cat",
  cats: "cat",
  feline: "cat",
  kitten: "cat",
  cattle: "cattle",
  cow: "cattle",
  cows: "cattle",
  bovine: "cattle",
  bull: "cattle"
};

/**
 * Map a free-text pet species onto the Stage 2C head key.
 * Returns null when the species has no trained model — callers must surface a
 * clear "image assessment unavailable" response instead of guessing.
 */
export const headKeyForSpecies = (species: string | undefined | null): string | null => {
  if (!species) {
    return null;
  }
  const key = species.trim().toLowerCase();
  const canonical = SPECIES_ALIASES[key] ?? null;
  return canonical ? SPECIES_TO_CV_HEAD[canonical] : null;
};

const CV_STAGE2_ROOT_DEFAULT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "reference-ml",
  "stage2_cv"
);

const resolveStage2Root = (): string => env.CV_STAGE2_ROOT?.trim() || CV_STAGE2_ROOT_DEFAULT;

/**
 * Python interpreter used to run the Stage 2C bridge.
 * Prefers the dedicated Stage 2 virtual environment (CV_PYTHON_PATH override
 * supported), then falls back to a bare "python" on PATH.
 */
const resolvePythonCommand = (): string => {
  const configured = env.CV_PYTHON_PATH?.trim();
  if (configured) {
    return configured;
  }

  const stage2Root = resolveStage2Root();
  const candidates =
    process.platform === "win32"
      ? [path.join(stage2Root, ".venv-stage2", "Scripts", "python.exe")]
      : [path.join(stage2Root, ".venv-stage2", "bin", "python")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return process.platform === "win32" ? "python" : "python3";
};

const BRIDGE_SCRIPT = path.resolve(__dirname, "..", "..", "ml", "cv_predict_bridge.py");
const CV_INFERENCE_TIMEOUT_MS = 120_000;

interface BridgeResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

const runBridgeInference = async (
  imagePath: string,
  headKey: string
): Promise<Record<string, unknown>> => {
  try {
    const { stdout } = await execFileAsync(
      resolvePythonCommand(),
      [BRIDGE_SCRIPT, imagePath, headKey],
      {
        timeout: CV_INFERENCE_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        env: {
          ...process.env,
          ...(env.CV_STAGE2_ROOT?.trim() ? { CV_STAGE2_ROOT: env.CV_STAGE2_ROOT.trim() } : {})
        }
      }
    );

    let parsed: BridgeResult;
    try {
      parsed = JSON.parse(stdout.trim()) as BridgeResult;
    } catch {
      throw new AppError("AI image assessment failed while analysing this image.", 502);
    }

    if (!parsed.success || !parsed.data) {
      throw new AppError(parsed.error ?? "AI image assessment failed.", 502);
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new AppError("AI image assessment engine is not available on this server.", 503);
    }
    throw new AppError("AI image assessment failed while analysing this image.", 502);
  }
};

export interface CvImagePredictionPayload {
  petId: string;
  file: Express.Multer.File;
}

export const runAiImagePrediction = async (
  actor: VeterinaryActor,
  payload: CvImagePredictionPayload
): Promise<Record<string, unknown>> => {
  if (!payload.file) {
    throw new AppError("A skin/dermatology image file is required for AI image assessment", 400);
  }

  try {
    await assertPetAccess(actor, payload.petId);

    const pet = await PetModel.findById(payload.petId).select("species name");
    if (!pet) {
      throw new AppError("Pet not found", 404);
    }

    const headKey = headKeyForSpecies(pet.species);
    if (!headKey) {
      throw new AppError(
        `AI image assessment unavailable for species "${pet.species}". ` +
          `Supported species: ${CV_SUPPORTED_SPECIES.join(", ")}.`,
        422
      );
    }

    return await runBridgeInference(payload.file.path, headKey);
  } finally {
    // Mirror uploadService cleanup semantics: always remove the temp upload,
    // on every post-validation path (unsupported species, missing pet, errors).
    await fs.rm(path.resolve(payload.file.path), { force: true }).catch(() => undefined);
  }
};
/**
 * Severity band used by the shared AI report model. Mirrors the symptom-report
 * convention (High -> high, Moderate -> moderate, else low).
 */
const severityFromBand = (band: string | undefined): "low" | "moderate" | "high" => {
  if (band === "High") return "high";
  if (band === "Moderate") return "moderate";
  return "low";
};

/**
 * Map the raw Stage 2C prediction contract into the shared AIReport document
 * shape. The existing symptom report stores its model output under `prediction`;
 * image assessments store the full Stage 2C contract under `imageAssessment`
 * and the same mapped fields under `prediction` so existing list/detail/review
 * consumers work unchanged. No filesystem paths are persisted here.
 */
const buildImageReportFromPrediction = (
  petId: string,
  prediction: Record<string, unknown>
): Record<string, unknown> => {
  const findings = (prediction.imageFindings as Record<string, unknown>) ?? {};
  const confidence = (prediction.imageConfidence as Record<string, unknown>) ?? {};

  const topConditions = Array.isArray(findings.top_conditions)
    ? (findings.top_conditions as Array<{ class?: string; probability?: number }>)
    : [];
  const predictedClass =
    typeof findings.predicted_class === "string" ? findings.predicted_class : "Unknown";
  const band = typeof confidence.band === "string" ? confidence.band : "Low";
  const probability = typeof confidence.probability === "number" ? confidence.probability : 0;

  return {
    petId,
    symptoms: [],
    uploadedImages: [],
    aiSummary:
      `Preliminary AI image assessment for ${predictedClass.replace(/_/g, " ")} with ${band} confidence ` +
      `(probability ${(probability * 100).toFixed(1)}%). This is a computer-vision screening result, ` +
      `not a clinical diagnosis. Veterinarian review is required.`,
    possibleConditions: topConditions.map((item) => item.class ?? "").filter(Boolean),
    severity: severityFromBand(band),
    recommendations: [
      "Veterinarian review is required before any treatment decision.",
      "This is a preliminary computer-vision screening result, not a clinical diagnosis."
    ],
    generatedAt: new Date(),
    veterinarianReviewStatus: "pending",
    modality: "image",
    imageAssessment: prediction,
    modelVersion:
      typeof findings.model_version === "string" ? findings.model_version : "vetflow-cv-v2.0.0-dev",
    contractVersion: "1.0.0",
    prediction: {
      predictedCondition: predictedClass,
      modelProbability: probability,
      confidenceLevel: band,
      // Reuse the shared `topPredictions[{condition, probability}]` shape.
      topPredictions: topConditions.map((item) => ({
        condition: item.class ?? "Unknown",
        probability: typeof item.probability === "number" ? item.probability : 0
      })),
      probabilities: (findings.probabilities as Record<string, number>) ?? {},
      explanation: {
        ...findings,
        disclaimer: typeof prediction.disclaimer === "string" ? prediction.disclaimer : ""
      }
    }
  };
};

/**
 * Persist a successful Stage 2C image assessment into the shared AI report
 * store so it appears in the existing AI Health Reports history and the
 * existing veterinarian-review workflow (same model + endpoints used by the
 * symptom reports). Ownership + authorization are enforced here via the shared
 * `createAiReport` service.
 */
export const saveAiImageReport = async (
  actor: VeterinaryActor,
  payload: CvImagePredictionPayload,
  prediction: Record<string, unknown>
) => {
  const reportPayload = buildImageReportFromPrediction(payload.petId, prediction);
  // createAiReport saves via the shared AIReport model (modality/imageAssessment
  // fields are picked up by the schema). Throws AppError for authorization/ownership.
  return createAiReport(actor, reportPayload as Parameters<typeof createAiReport>[1]);
};
