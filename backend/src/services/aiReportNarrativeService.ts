import type {
  CombinedAssessmentResult,
  HistoryEvidence,
  ImageEvidence,
  SymptomEvidence
} from "./combinedAssessmentService.js";

/**
 * Stage 3 â€” AI Report Narrative (optional LLM reporting layer).
 *
 * The LLM layer is STRICTLY a digest/explainer for ALREADY-GENERATED
 * structured evidence. It must NOT diagnose, invent symptoms, invent image
 * findings, invent history, change probabilities, override the combined
 * engine, or give clinically authoritative treatment advice.
 *
 * No provider dependency is forced. The current implementation is a
 * DETERMINISTIC template provider behind a clean interface. A real LLM provider
 * can be added later without touching the combined engine (feature flag:
 * STAGE3_LLM_ENABLED). No API keys are hard-coded or required here.
 */

export interface NarrativeInputs {
  symptom: SymptomEvidence | null;
  image: ImageEvidence | null;
  history: HistoryEvidence | null;
  result: CombinedAssessmentResult;
}

export interface NarrativeProvider {
  readonly enabled: boolean;
  generate(inputs: NarrativeInputs): string;
}

/** Deterministic template provider â€” safe, explainable, no external call. */
class TemplateNarrativeProvider implements NarrativeProvider {
  readonly enabled = true;

  generate(inputs: NarrativeInputs): string {
    const { result, symptom, image } = inputs;
    const lines: string[] = [];

    lines.push(
      `This is a preliminary combined AI assessment for "${result.predictedCondition}" ` +
        `at ${result.evidenceBand} evidence confidence.`
    );
    if (symptom) {
      lines.push(
        `Symptom model flagged "${symptom.condition}" ` +
          `(model confidence ${symptom.confidenceLevel}).`
      );
    }
    if (image) {
      lines.push(
        `Image model flagged "${image.predictedClass}" ` +
          `(image confidence ${image.band}).`
      );
    }
    if (!symptom && !image) {
      lines.push("No symptom or image evidence was provided.");
    }
    if (result.modalityDisagreement) {
      lines.push(
        "The symptom and image models disagree; both views are preserved for " +
          "veterinarian review and neither should be relied on alone."
      );
    }
    if (result.conflicts.length > 0) {
      lines.push("Conflict flag(s) were emitted and are shown in the detail.");
    }
    lines.push(
      "This text is generated from structured model outputs only and is not a " +
        "diagnosis. A veterinarian must review before any clinical decision."
    );
    return lines.join(" ");
  }
}

export function createNarrativeProvider(_enabled: boolean): NarrativeProvider {
  return new TemplateNarrativeProvider(); // Deterministic provider always available.
}

export const buildCombinedNarrative = (
  inputs: NarrativeInputs,
  provider: NarrativeProvider = new TemplateNarrativeProvider()
): string => provider.generate(inputs);