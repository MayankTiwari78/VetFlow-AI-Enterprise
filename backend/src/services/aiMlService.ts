import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import AIReportModel from "../models/AIReport.js";
import PetModel from "../models/Pet.js";
import { AppError } from "../utils/AppError.js";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_SCRIPT = path.resolve(__dirname, "../../ml/ai_predict.py");
/** Repo backend directory — stable cwd for the child process. */
const BACKEND_DIR = path.resolve(__dirname, "..", "..");

const SYMPTOM_MODEL_TIMEOUT_MS = 30_000;

/** User-facing messages never include paths or interpreter internals. */
const SYMPTOM_MODEL_UNAVAILABLE =
  "AI symptom assessment is temporarily unavailable. Please try again shortly.";
const SYMPTOM_MODEL_FAILED =
  "AI symptom assessment could not be completed. Please try again.";

interface PythonRunResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Interpreter candidates for the Stage 1 symptom model.
 * Ordered: explicit config override -> "python" -> "python3". Every candidate
 * is passed to execFile as a program (never through a shell), so PATH quirks
 * and cmd.exe quoting cannot corrupt the JSON payload.
 */
export const pythonCandidateCommands = (): string[] => {
  const configured = env.STAGE1_PYTHON_PATH?.trim();
  const base = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
  return configured ? [configured, ...base] : base;
};

/**
 * Run the Stage 1 symptom model.
 *
 * Production hardening (replaces the previous shell-string invocation):
 *  - execFile + argv array: the JSON payload travels as ONE argv element.
 *    No shell => no cmd.exe quote mangling, no escaping, no injection surface.
 *  - cwd pinned to the backend directory.
 *  - Timeout kills the child and reports a clear error.
 *  - stdout is parsed EVEN on non-zero exit: ai_predict.py prints
 *    {"success": false, "error": "..."} before exiting 1, so the real model
 *    error is surfaced instead of a generic "Command failed: ..." wrapper.
 *  - stderr/exit-code/duration are logged (development diagnostics) but never
 *    returned to API clients.
 */
export const runPythonPrediction = async (
  symptoms: SymptomInput
): Promise<Record<string, unknown>> => {
  const payload = JSON.stringify({ symptoms });
  const startedAt = Date.now();
  let lastError: unknown;

  for (const interpreter of pythonCandidateCommands()) {
    try {
      const { stdout } = await execFileAsync(interpreter, [ML_SCRIPT, payload], {
        cwd: BACKEND_DIR,
        maxBuffer: 4 * 1024 * 1024,
        timeout: SYMPTOM_MODEL_TIMEOUT_MS,
        windowsHide: true
      });
      return parseSymptomModelOutput(stdout, Date.now() - startedAt, interpreter);
    } catch (error) {
      lastError = error;

      // Exit-code failures still carry the model's JSON error on stdout —
      // parse it and let its structured AppError (422 model error / 502
      // malformed output) propagate to the API instead of a generic wrapper.
      const stdout = (error as { stdout?: string }).stdout;
      if (typeof stdout === "string" && stdout.trim().length > 0) {
        return parseSymptomModelOutput(stdout, Date.now() - startedAt, interpreter);
      }

      const err = error as { code?: unknown; killed?: boolean; stderr?: unknown };
      logger.error(
        {
          event: "ai.stage1.symptom_model.failed",
          interpreter,
          exitCode: typeof err.code === "number" ? err.code : null,
          timedOut: err.killed === true,
          durationMs: Date.now() - startedAt,
          stderr: typeof err.stderr === "string" ? err.stderr.slice(0, 2000) : null,
          stdout: typeof stdout === "string" ? stdout.slice(0, 2000) : null
        },
        "Stage 1 symptom model invocation failed"
      );

      // ENOENT => interpreter not found; try the next candidate.
      if (err.code === "ENOENT") {
        continue;
      }
      break;
    }
  }

  const err = lastError as { killed?: boolean } | undefined;
  if (err?.killed) {
    throw new AppError("AI symptom assessment timed out. Please try again.", 504);
  }
  logger.error(
    { event: "ai.stage1.symptom_model.unavailable", durationMs: Date.now() - startedAt },
    "Stage 1 symptom model unavailable"
  );
  throw new AppError(SYMPTOM_MODEL_UNAVAILABLE, 503);
};

function parseSymptomModelOutput(
  stdout: string,
  durationMs: number,
  interpreter: string
): Record<string, unknown> {
  let parsed: PythonRunResult;
  try {
    parsed = JSON.parse(stdout) as PythonRunResult;
  } catch {
    logger.error(
      {
        event: "ai.stage1.symptom_model.malformed_output",
        interpreter,
        durationMs,
        stdout: stdout.slice(0, 2000)
      },
      "Stage 1 symptom model returned malformed output"
    );
    throw new AppError(SYMPTOM_MODEL_FAILED, 502);
  }

  if (!parsed || parsed.success !== true || !parsed.data) {
    throw new AppError(
      typeof parsed?.error === "string" && parsed.error.trim().length > 0
        ? parsed.error
        : SYMPTOM_MODEL_FAILED,
      422
    );
  }

  logger.info(
    { event: "ai.stage1.symptom_model.completed", interpreter, durationMs },
    "Stage 1 symptom model prediction completed"
  );
  return parsed.data;
}


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
