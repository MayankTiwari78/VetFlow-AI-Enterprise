import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";

/**
 * Stage 3 - Combined Assessment Engine (VetFlow-AI).
 * Fuses symptom ML (Stage 1) + image CV (Stage 2C) + pet history into ONE
 * deterministic, explainable, versioned preliminary assessment.
 *
 * DESIGN DECISION: Stage 1 modelProbability is LogisticRegression predict_proba
 * that is EXPLICITLY not clinically calibrated, and Stage 2C probabilities are
 * temperature-calibrated softmax over a DIFFERENT taxonomy. They are NOT
 * compatible for direct probability averaging, so this engine never averages
 * them. Each source is reduced to a normalized within-modality evidence support
 * in [0,1] (band base x relative confidence), then combined with weights. The
 * output is model/evidence confidence - never medical certainty.
 *
 * Pure function (no I/O, DB, or python) => deterministically unit-testable.
 */

export interface VeterinaryActor {
  accountId: string;
  accountType: AccountType;
  role: EnterpriseRole;
  permissions: Permission[];
}

export type EvidenceBand = "High" | "Moderate" | "Low";

export interface SymptomEvidence {
  condition: string;
  modelProbability: number;
  confidenceLevel: EvidenceBand;
  topPredictions: Array<{ condition: string; probability: number }>;
}

export interface ImageEvidence {
  predictedClass: string;
  band: EvidenceBand;
  probability: number;
  topConditions: Array<{ class: string; probability: number }>;
  headKey?: string;
  modelVersion?: string;
}

export interface HistoryEvidence {
  species?: string;
  breed?: string;
  age?: number;
  priorConditions: string[];
  medicalHistory: string[];
  allergies: string[];
}

export interface NormalizedEvidence {
  symptom: SymptomEvidence | null;
  image: ImageEvidence | null;
  history: HistoryEvidence | null;
}

export const COMBINED_ENGINE_VERSION = "vetflow-ai-combined-v1.0.0-dev";
export const COMBINED_CONTRACT_VERSION = "1.0.0";
export const COMBINED_ASSESSMENT_TYPE = "PRELIMINARY_AI_ASSESSMENT";
export const COMBINED_DISCLAIMER =
  "This is a PRELIMINARY COMBINED AI ASSESSMENT generated from symptom " +
  "indicators, a single image, and pet history. It is NOT a diagnosis and " +
  "MUST NOT be used for treatment decisions. Model probabilities are not " +
  "clinically calibrated and are NOT medical certainty. Veterinarian review " +
  "is required.";

const BAND_BASE: Record<EvidenceBand, number> = { High: 1.0, Moderate: 0.6, Low: 0.33 };

export interface FusionWeights {
  symptom: number;
  image: number;
  history: number;
}
export const DEFAULT_FUSION_WEIGHTS: FusionWeights = {
  symptom: 0.45,
  image: 0.45,
  history: 0.1
};


const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const normName = (value: string): string => value.trim().toLowerCase().replace(/[\s_/-]+/g, " ");

function supportFrom(prob: number, band: EvidenceBand, maxProbability: number): number {
  const maxValid = maxProbability > 0 ? maxProbability : 1;
  const intra = clamp01(prob / maxValid);
  return clamp01(BAND_BASE[band] * (0.6 + 0.4 * intra));
}

function buildDisplayLabels(
  symptom: SymptomEvidence | null,
  image: ImageEvidence | null
): Map<string, string> {
  const labels = new Map<string, string>();
  if (symptom) {
    labels.set(normName(symptom.condition), symptom.condition);
    for (const t of symptom.topPredictions) {
      const k = normName(t.condition);
      if (!labels.has(k)) labels.set(k, t.condition);
    }
  }
  // Image canonical labels win on collision (persisted conditions stay consistent
  // with the dermatology taxonomy).
  if (image) {
    labels.set(normName(image.predictedClass), image.predictedClass);
    for (const c2 of image.topConditions) labels.set(normName(c2.class), c2.class);
  }
  return labels;
}
function symptomRows(evidence: SymptomEvidence | null): Map<string, number> {
  const rows = new Map<string, number>();
  if (!evidence) return rows;
  const max = Math.max(evidence.modelProbability, ...evidence.topPredictions.map((p) => p.probability), 1e-9);
  const push = (condition: string, prob: number) => {
    rows.set(normName(condition), Math.max(rows.get(normName(condition)) ?? 0, supportFrom(prob, evidence.confidenceLevel, max)));
  };
  push(evidence.condition, evidence.modelProbability);
  for (const top of evidence.topPredictions) push(top.condition, top.probability);
  return rows;
}

function imageRows(evidence: ImageEvidence | null): Map<string, number> {
  const rows = new Map<string, number>();
  if (!evidence) return rows;
  const maxProb = Math.max(evidence.probability, ...evidence.topConditions.map((c) => c.probability), 1e-9);
  rows.set(normName(evidence.predictedClass), supportFrom(evidence.probability, evidence.band, maxProb));
  for (const cond of evidence.topConditions) {
    rows.set(normName(cond.class), Math.max(rows.get(normName(cond.class)) ?? 0, supportFrom(cond.probability, evidence.band, maxProb)));
  }
  return rows;
}

function historySupport(history: HistoryEvidence | null, condition: string): number {
  if (!history) return 0;
  const key = normName(condition);
  let support = 0;
  if (history.priorConditions.some((c) => normName(c) === key)) support += 0.18;
  if (history.medicalHistory.some((c) => normName(c) === key)) support += 0.15;
  if (history.allergies.some((a) => normName(a).includes(key) || key.includes(normName(a)))) support += 0.08;
  return clamp01(support);
}
export interface CombinedConflict {
  symptomCondition: string | null;
  imageCondition: string | null;
  magnitude: number;
  note: string;
}

export interface CombinedAssessmentResult {
  modelModality: "combined";
  assessmentType: string;
  veterinarianReviewRequired: true;
  engineVersion: string;
  contractVersion: string;
  modalityDisagreement: boolean;
  predictedCondition: string;
  evidenceBand: EvidenceBand;
  topConditions: Array<{ condition: string; score: number; source: string[] }>;
  contributingEvidence: Array<{ condition: string; source: string; detail: string }>;
  conflicts: CombinedConflict[];
  fusionWeights: FusionWeights;
  confidenceLimitation: string;
  disclaimer: string;
}

const LIMITATION =
  "Symptom and image probabilities are normalized within-modality evidence " +
  "supports, not clinically calibrated likelihoods. Weights and bands are " +
  "heuristic integration guidance, not clinical validation.";

function bandFromScore(score: number): EvidenceBand {
  return score >= 0.66 ? "High" : score >= 0.4 ? "Moderate" : "Low";
}

/**
 * Run the deterministic fusion engine.
 * Returns a versioned, explainable combined assessment. Never a diagnosis.
 */
export function runCombinedAssessment(
  evidence: NormalizedEvidence,
  weights: FusionWeights = DEFAULT_FUSION_WEIGHTS
): CombinedAssessmentResult {
  const symptom = symptomRows(evidence.symptom);
  const image = imageRows(evidence.image);

  // Union of candidate condition names across both modalities.
  const candidates = new Set<string>([...symptom.keys(), ...image.keys()]);
  const display = buildDisplayLabels(evidence.symptom, evidence.image);

  const rows: Array<{ condition: string; score: number; source: string[] }> = [];
  const contributing: Array<{ condition: string; source: string; detail: string }> = [];
  let modalityDisagreement = false;

  for (const condition of candidates) {
    const s = symptom.get(condition) ?? 0;
    const im = image.get(condition) ?? 0;
    const h = historySupport(evidence.history, condition);
    const score = clamp01(weights.symptom * s + weights.image * im + weights.history * h);
    const source: string[] = [];
    if (s > 0) source.push("symptom");
    if (im > 0) source.push("image");
    if (h > 0) source.push("history");
    const label = display.get(condition) ?? condition;
    rows.push({ condition: label, score: round4(score), source });
    if (s > 0) contributing.push({ condition: label, source: "symptom", detail: round4(s).toString() });
    if (im > 0) contributing.push({ condition: label, source: "image", detail: round4(im).toString() });
    if (h > 0) contributing.push({ condition: label, source: "history", detail: round4(h).toString() });
  }

  rows.sort((a, b) => b.score - a.score || a.condition.localeCompare(b.condition));
  const predicted = rows[0]
    ? { condition: rows[0].condition, score: rows[0].score }
    : { condition: "Unknown", score: 0 };
  const evidenceBand = bandFromScore(predicted.score);

  // Detect explicit modality disagreement (never silently hide it).
  const symLead = evidence.symptom ? normName(evidence.symptom.condition) : null;
  const imgLead = evidence.image ? normName(evidence.image.predictedClass) : null;
  const conflicts: CombinedConflict[] = [];
  if (symLead && imgLead && symLead !== imgLead) {
    const sTop = symptom.get(symLead) ?? 0;
    const iTop = image.get(imgLead) ?? 0;
    const magnitude = Math.abs(sTop - iTop);
    modalityDisagreement = true; // differing modality leads are never hidden.
    conflicts.push({
      symptomCondition: evidence.symptom!.condition,
      imageCondition: evidence.image!.predictedClass,
      magnitude: round4(magnitude),
      note:
        "Symptom and image models disagree; both are shown and neither was suppressed."
    });
  }

  return {
    modelModality: "combined",
    assessmentType: COMBINED_ASSESSMENT_TYPE,
    veterinarianReviewRequired: true,
    engineVersion: COMBINED_ENGINE_VERSION,
    contractVersion: COMBINED_CONTRACT_VERSION,
    modalityDisagreement,
    predictedCondition: predicted.condition,
    evidenceBand,
    topConditions: rows.slice(0, 5).map((row) => ({
      condition: row.condition,
      score: row.score,
      source: row.source
    })),
    contributingEvidence: contributing.slice(0, 12),
    conflicts,
    fusionWeights: { ...weights },
    confidenceLimitation: LIMITATION,
    disclaimer: COMBINED_DISCLAIMER
  };
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
