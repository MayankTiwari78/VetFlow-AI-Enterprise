import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { env } from "../config/env.js";
import { assertPetAccess, type VeterinaryActor } from "./aiMlService.js";
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
