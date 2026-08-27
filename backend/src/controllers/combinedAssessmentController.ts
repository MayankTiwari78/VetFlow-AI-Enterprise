import type { Request } from "express";
import type { RequestHandler } from "express";

import AIReportModel from "../models/AIReport.js";
import PetModel from "../models/Pet.js";
import {
  assertPetAccess,
  runAiPrediction,
  type AiPredictionPayload,
  type VeterinaryActor
} from "../services/aiMlService.js";
import { headKeyForSpecies } from "../services/cvImageService.js";
import {
  runCombinedAssessment,
  type CombinedAssessmentResult,
  type EvidenceBand,
  type HistoryEvidence,
  type ImageEvidence,
  type SymptomEvidence
} from "../services/combinedAssessmentService.js";
import { buildCombinedNarrative, type NarrativeInputs } from "../services/aiReportNarrativeService.js";
import { createAiReport } from "../services/veterinaryService.js";
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

export interface CombinedBody {
  petId?: string;
  symptoms?: AiPredictionPayload["symptoms"];
  imageReportId?: string;
}

function toSymptomEvidence(prediction: Record<string, unknown>): SymptomEvidence {
  const topPredictions = (prediction.topPredictions as Array<{ condition: string; probability: number }>) ?? [];
  return {
    condition: String(prediction.predictedCondition ?? "Unknown"),
    modelProbability: Number(prediction.modelProbability ?? 0),
    confidenceLevel: (prediction.confidenceLevel as EvidenceBand) ?? "Low",
    topPredictions
  };
}

function toImageEvidence(imageAssessment: Record<string, unknown>): ImageEvidence {
  const findings = (imageAssessment.imageFindings as Record<string, unknown>) ?? {};
  const confidence = (imageAssessment.imageConfidence as Record<string, unknown>) ?? {};
  const topConditions = Array.isArray(findings.top_conditions)
    ? (findings.top_conditions as Array<{ class: string; probability: number }>)
    : [];
  return {
    predictedClass: String(findings.predicted_class ?? "Unknown"),
    band: (confidence.band as EvidenceBand) ?? "Low",
    probability: Number(confidence.probability ?? 0),
    topConditions,
    headKey: typeof findings.head_key === "string" ? findings.head_key : undefined,
    modelVersion: typeof findings.model_version === "string" ? findings.model_version : undefined
  };
}

async function gatherHistory(petId: string): Promise<HistoryEvidence> {
  const pet = await PetModel.findById(petId).select("species breed age allergies medicalHistory");
  const reports =
    (await AIReportModel.find({ petId })
      .sort({ generatedAt: -1 })
      .limit(20)
      .select("prediction.predictedCondition")) || [];
  const priorConditions = reports
    .map((r) => r.prediction?.predictedCondition)
    .filter((c): c is string => Boolean(c));
  return {
    species: pet?.species,
    breed: pet?.breed,
    age: pet?.age,
    allergies: pet?.allergies ?? [],
    medicalHistory: pet?.medicalHistory ?? [],
    priorConditions
  };
}

async function resolveImageEvidence(petId: string, reportId?: string): Promise<ImageEvidence | null> {
  if (!reportId) return null;
  const report = await AIReportModel.findById(reportId);
  if (!report || String(report.petId) !== petId || report.modality !== "image") {
    throw new AppError("A valid saved image report for this pet is required", 400);
  }
  return toImageEvidence((report.imageAssessment as Record<string, unknown>) ?? {});
}

function severityFromBand(band: EvidenceBand): "low" | "moderate" | "high" {
  if (band === "High") return "high";
  if (band === "Moderate") return "moderate";
  return "low";
}

/**
 * Pure wrapper: run the deterministic engine + deterministic narrative.
 * Exported for direct unit testing (no I/O).
 */
export function buildCombinedAssessment(
  symptom: SymptomEvidence | null,
  image: ImageEvidence | null,
  history: HistoryEvidence | null
): Record<string, unknown> {
  const result = runCombinedAssessment({ symptom, image, history });
  const narrativeInputs: NarrativeInputs = { symptom, image, history, result };
  const narrative = buildCombinedNarrative(narrativeInputs);
  return {
    modelModality: "combined",
    assessmentType: result.assessmentType,
    veterinarianReviewRequired: true,
    contractVersion: result.contractVersion,
    engineVersion: result.engineVersion,
    inputs: {
      symptom,
      image,
      history: {
        species: history?.species ?? null,
        breed: history?.breed ?? null,
        age: history?.age ?? null,
        priorConditionCount: history?.priorConditions.length ?? 0,
        priorConditions: (history?.priorConditions ?? []).slice(0, 10),
        medicalHistory: (history?.medicalHistory ?? []).slice(0, 20),
        allergies: (history?.allergies ?? []).slice(0, 20)
      }
    },
    combinedAssessment: result as CombinedAssessmentResult,
    safety: {
      isPreliminary: true,
      clinicalDiagnosis: false,
      disclaimer: result.disclaimer,
      veterinarianReviewRequired: true
    },
    narrative
  };
}

/**
 * Pure: shape the backward-compatible AIReport payload from a combined
 * assessment. Exported for direct unit testing.
 */
export function buildCombinedReportDocument(
  petId: string,
  assessment: Record<string, unknown>
): Record<string, unknown> {
  const result = assessment.combinedAssessment as CombinedAssessmentResult;
  return {
    petId,
    symptoms: [],
    uploadedImages: [],
    aiSummary: String(assessment.narrative ?? ""),
    possibleConditions: result.topConditions.map((row) => row.condition),
    severity: severityFromBand(result.evidenceBand),
    recommendations: [
      "Veterinarian review is required before any treatment decision.",
      "This is a preliminary combined AI assessment, not a clinical diagnosis."
    ],
    generatedAt: new Date(),
    veterinarianReviewStatus: "pending",
    modality: "combined",
    modelVersion: result.engineVersion,
    contractVersion: result.contractVersion,
    prediction: {
      predictedCondition: result.predictedCondition,
      modelProbability: result.topConditions[0]?.score ?? 0,
      confidenceLevel: result.evidenceBand,
      topPredictions: result.topConditions.map((row) => ({ condition: row.condition, probability: row.score })),
      probabilities: {},
      explanation: {
        contributingEvidence: result.contributingEvidence,
        conflicts: result.conflicts,
        disclaimer: result.disclaimer
      }
    },
    combinedAssessment: {
      result,
      inputs: (assessment.inputs as Record<string, unknown>) ?? {}
    }
  };
}

export interface CombinedContext {
  actor: VeterinaryActor;
  petId: string;
  assessment: Record<string, unknown>;
}

export async function evaluateCombined(req: Request): Promise<CombinedContext> {
  const actor = veterinaryActorFromRequest(req);
  const body = req.body as CombinedBody;
  const petId = String(body.petId);
  if (!petId) throw new AppError("Pet is required", 400);
  if (!body.symptoms && !body.imageReportId) {
    throw new AppError("At least one of symptoms or an image report is required", 400);
  }

  await assertPetAccess(actor, petId);

  let symptom: SymptomEvidence | null = null;
  if (body.symptoms) {
    const prediction = await runAiPrediction(actor, { petId, symptoms: body.symptoms });
    symptom = toSymptomEvidence(prediction);
  }

  const image = await resolveImageEvidence(petId, body.imageReportId);
  const history = await gatherHistory(petId);
  if (image && history.species && !headKeyForSpecies(history.species)) {
    throw new AppError(
      "AI image assessment unavailable for this pet's species in a combined assessment.",
      422
    );
  }

  const assessment = buildCombinedAssessment(symptom, image, history);
  return { actor, petId, assessment };
}

export const combinedAssessmentPredict: RequestHandler = asyncHandler(async (req, res) => {
  const ctx = await evaluateCombined(req);
  sendSuccess(res, 200, "Combined preliminary AI assessment generated", { assessment: ctx.assessment });
});

export const combinedAssessmentSave: RequestHandler = asyncHandler(async (req, res) => {
  const ctx = await evaluateCombined(req);
  const report = await createAiReport(
    ctx.actor,
    buildCombinedReportDocument(ctx.petId, ctx.assessment) as Parameters<typeof createAiReport>[1]
  );
  sendSuccess(res, 201, "Combined preliminary AI assessment saved to history", {
    report: report.toObject ? report.toObject() : report
  });
});
