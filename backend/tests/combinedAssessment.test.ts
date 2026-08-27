import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCombinedAssessment,
  buildCombinedReportDocument
} from "../src/controllers/combinedAssessmentController.js";
import {
  DEFAULT_FUSION_WEIGHTS,
  runCombinedAssessment,
  type ImageEvidence,
  type SymptomEvidence
} from "../src/services/combinedAssessmentService.js";

/**
 * Stage 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Combined Assessment engine tests.
 * The fusion engine is a pure, deterministic function; these tests verify the
 * evidence-normalization + weighted fusion + explicit-disagreement behaviour.
 */

const symHealthy: SymptomEvidence = {
  condition: "Healthy",
  modelProbability: 0.8,
  confidenceLevel: "High",
  topPredictions: [
    { condition: "Healthy", probability: 0.8 },
    { condition: "Fever", probability: 0.15 },
    { condition: "Cough", probability: 0.05 }
  ]
};

const symFever: SymptomEvidence = {
  condition: "Fever",
  modelProbability: 0.62,
  confidenceLevel: "Moderate",
  topPredictions: [
    { condition: "Fever", probability: 0.62 },
    { condition: "Healthy", probability: 0.38 }
  ]
};

const imgHealthy: ImageEvidence = {
  predictedClass: "healthy",
  band: "High",
  probability: 0.91,
  topConditions: [
    { class: "healthy", probability: 0.91 },
    { class: "fungal", probability: 0.07 },
    { class: "parasitic_mange", probability: 0.02 }
  ],
  headKey: "dog_derm_coarse",
  modelVersion: "vetflow-cv-v2.0.0-dev"
};

const imgFungal: ImageEvidence = {
  predictedClass: "fungal",
  band: "High",
  probability: 0.89,
  topConditions: [
    { class: "fungal", probability: 0.89 },
    { class: "healthy", probability: 0.08 },
    { class: "ringworm", probability: 0.03 }
  ],
  headKey: "dog_derm_coarse",
  modelVersion: "vetflow-cv-v2.0.0-dev"
};

describe("buildCombinedAssessment / buildCombinedReportDocument ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â persistence shape", () => {
  it("16. persistence shape: modality combined, review pending, no path leakage", () => {
    const assessment = buildCombinedAssessment(symFever, null, null);
    const doc = buildCombinedReportDocument("507f191e810c19729de860ea", assessment);
    expect(doc.modality).toBe("combined");
    expect(doc.veterinarianReviewStatus).toBe("pending");
    expect(doc.combinedAssessment.result.modelModality).toBe("combined");
    expect(doc.prediction).toBeDefined();
    expect(doc.petId).toBe("507f191e810c19729de860ea");
    const blob = JSON.stringify(doc);
    expect(blob).not.toMatch(/\/tmp|\/Users|C:\\Users|checkpoints|\.py/);
  });

  it("17. combined report is retrievable through the shared AIReport shape (list/detail compatible)", () => {
    const assessment = buildCombinedAssessment(symFever, imgFungal, null);
    const doc = buildCombinedReportDocument("507f191e810c19729de860ea", assessment);
    // Fields required by existing list/detail/review consumers:
    expect(doc.aiSummary).toEqual(expect.any(String));
    expect(doc.severity).toMatch(/low|moderate|high/);
    expect(doc.possibleConditions).toEqual(expect.any(Array));
    expect(doc.recommendations.length).toBeGreaterThan(0);
    expect(doc.generatedAt).toBeInstanceOf(Date);
    expect(doc.prediction.predictedCondition).toEqual(expect.any(String));
  });

  it("veterinarian-review gate: combined never stores reviewed/dismissed and never required-false", () => {
    const assessment = buildCombinedAssessment(symFever, null, null);
    const doc = buildCombinedReportDocument("507f191e810c19729de860ea", assessment);
    expect(doc.veterinarianReviewStatus).toBe("pending");
    expect((doc.combinedAssessment.result.veterinarianReviewRequired as boolean)).toBe(true);
  });
});

const petFindByIdMock = vi.hoisted(() => vi.fn());
const aiReportFindByIdMock = vi.hoisted(() => vi.fn());
const aiReportFindMock = vi.hoisted(() => vi.fn());
const runAiPredictionMock = vi.hoisted(() => vi.fn());
const assertPetAccessMock = vi.hoisted(() => vi.fn());
const createAiReportMock = vi.hoisted(() => vi.fn());

vi.mock("../src/models/Pet.js", () => ({
  default: {
    findById: (...args) => ({ select: () => Promise.resolve(petFindByIdMock(...args)) })
  }
}));

vi.mock("../src/models/AIReport.js", () => ({
  default: {
    findById: (...args) => aiReportFindByIdMock(...args),
    find: () => ({
      sort: () => ({ limit: () => ({ select: () => Promise.resolve(aiReportFindMock()) }) })
    })
  }
}));

vi.mock("../src/services/aiMlService.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runAiPrediction: runAiPredictionMock,
    assertPetAccess: assertPetAccessMock
  };
});

vi.mock("../src/services/veterinaryService.js", () => ({
  createAiReport: createAiReportMock
}));

import { AppError } from "../src/utils/AppError.js";
import {
  combinedAssessmentSave,
  evaluateCombined
} from "../src/controllers/combinedAssessmentController.js";

const makeReq = (body: Record<string, unknown>): any => ({
  body,
  authAccountId: "account-1",
  authAccountType: "patient",
  authRole: "ORGANIZATION_MEMBER",
  authPermissions: ["users:manage"],
  headers: {}
});

const makeRes = (): any => {
  const res: any = { statusCode: 0, body: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: unknown) => { res.jsonBody = payload; return res; };
  return res;
};

describe("combinedAssessment controller ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â guard rails", () => {
  beforeEach(() => {
    petFindByIdMock.mockReset();
    aiReportFindByIdMock.mockReset();
    aiReportFindMock.mockReset();
    runAiPredictionMock.mockReset();
    assertPetAccessMock.mockReset();
    createAiReportMock.mockReset();
    assertPetAccessMock.mockResolvedValue(undefined);
  });

  it("8. missing required input ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â petId omitted => 400", async () => {
    await expect(evaluateCombined(makeReq({}))).rejects.toMatchObject({ statusCode: 400 });
  });

  it("missing required input ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no symptom/image source => 400", async () => {
    await expect(
      evaluateCombined(makeReq({ petId: "507f191e810c19729de860ea" }))
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("At least one") });
  });

  it("10. unauthorized user ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â missing valid actor => 401", async () => {
    const req: any = { body: { petId: "507f191e810c19729de860ea", symptoms: {} } };
    await expect(evaluateCombined(req)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("10b. forbidden ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â actor lacks permission => 403", async () => {
    assertPetAccessMock.mockRejectedValue(new AppError("Forbidden", 403));
    await expect(
      evaluateCombined(makeReq({ petId: "507f191e810c19729de860ea", symptoms: { Fever: 1, Cough: 0, Diarrhea: 0, Lethargy: 0, Loss_of_Appetite: 0 } }))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("11. user attempting another pet is treated as not found (404)", async () => {
    assertPetAccessMock.mockRejectedValue(new AppError("Pet not found", 404));
    await expect(
      evaluateCombined(makeReq({ petId: "507f191e810c19729de860ea", symptoms: { Fever: 1, Cough: 0, Diarrhea: 0, Lethargy: 0, Loss_of_Appetite: 0 } }))
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("7. unsupported species with an image report => 422 (no silent fallback)", async () => {
    petFindByIdMock.mockResolvedValue({ species: "Parrot" });
    aiReportFindByIdMock.mockResolvedValue({
      petId: "507f191e810c19729de860ea",
      modality: "image",
      imageAssessment: {
        imageFindings: { predicted_class: "ringworm", top_conditions: [] , model_version: "v2"},
        imageConfidence: { band: "High", probability: 0.8 }
      }
    });
    aiReportFindMock.mockResolvedValue([]);
    await expect(
      evaluateCombined(makeReq({ petId: "507f191e810c19729de860ea", imageReportId: "507f191e810c19729de860eb" }))
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(runAiPredictionMock).not.toHaveBeenCalled();
  });

  it("invalid image report for another modality/pet => 400", async () => {
    aiReportFindByIdMock.mockResolvedValue({
      petId: "000000000000000000000000",
      modality: "image",
      imageAssessment: { imageFindings: {}, imageConfidence: {} }
    });
    await expect(
      evaluateCombined(makeReq({ petId: "507f191e810c19729de860ea", imageReportId: "507f191e810c19729de860eb" }))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("16. save persists a combined AIReport via createAiReport", async () => {
    petFindByIdMock.mockResolvedValue({ species: "Dog", breed: "Lab", allergies: [], medicalHistory: [] });
    runAiPredictionMock.mockResolvedValue({
      predictedCondition: "Healthy",
      modelProbability: 0.8,
      confidenceLevel: "High",
      topPredictions: [{ condition: "Healthy", probability: 0.8 }]
    });
    const fakeReport = { _id: "report-1", toObject: () => ({ _id: "report-1" }) };
    createAiReportMock.mockResolvedValue(fakeReport);

    const errs: Array<{ message?: string; code?: number }> = [];
    const res = makeRes();
    await combinedAssessmentSave(
      makeReq({ petId: "507f191e810c19729de860ea", symptoms: { Fever: 0, Cough: 0, Diarrhea: 0, Lethargy: 0, Loss_of_Appetite: 0 } }),
      res,
      (e: unknown) => { const err = e as { message?: string; statusCode?: number }; errs.push({ message: err?.message, code: err?.statusCode }); }
    );
    await vi.waitFor(() => {
      if (errs.length > 0) throw errs[0];
      expect(res.statusCode).toBe(201);
    });
    expect(createAiReportMock).toHaveBeenCalledTimes(1);
    const saved = createAiReportMock.mock.calls[0][1] as Record<string, any>;
    expect(saved.modality).toBe("combined");
    expect(saved.veterinarianReviewStatus).toBe("pending");
    expect(saved.combinedAssessment?.result?.modelModality).toBe("combined");
    expect(JSON.stringify(saved)).not.toMatch(/\/tmp|C:\\Users|checkpoints|\.py/);
  });
});

describe("runCombinedAssessment engine", () => {
  it("1. symptom-only evidence", () => {
    const result = runCombinedAssessment({ symptom: symFever, image: null, history: null });
    expect(result.modelModality).toBe("combined");
    expect(result.veterinarianReviewRequired).toBe(true);
    expect(result.predictedCondition).toBe("Fever");
    expect(result.conflicts).toHaveLength(0);
    expect(new Set(result.topConditions.flatMap((r) => r.source)).has("symptom")).toBe(true);
  });

  it("2. image-only evidence", () => {
    const result = runCombinedAssessment({ symptom: null, image: imgFungal, history: null });
    expect(result.predictedCondition).toBe("fungal");
    const sources = new Set(result.topConditions.flatMap((r) => r.source));
    expect(sources.has("image")).toBe(true);
    expect(sources.has("symptom")).toBe(false);
  });

  it("3. symptom+image agreement shows both sources, no conflict", () => {
    const result = runCombinedAssessment({ symptom: symHealthy, image: imgHealthy, history: null });
    expect(result.modalityDisagreement).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.predictedCondition).toBe("healthy");
    const s = new Set(result.topConditions.flatMap((r) => r.source));
    expect(s.has("symptom") && s.has("image")).toBe(true);
  });

  it("4. disagreement explicit (conflict), never collapsed", () => {
    const result = runCombinedAssessment({ symptom: symHealthy, image: imgFungal, history: null });
    expect(result.modalityDisagreement).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].symptomCondition).toBe("Healthy");
    expect(result.conflicts[0].imageCondition).toBe("fungal");
  });

  it("5. history present contributes history evidence on prior match", () => {
    const result = runCombinedAssessment({
      symptom: symHealthy,
      image: null,
      history: { species: "Dog", priorConditions: ["healthy"], medicalHistory: [], allergies: [] }
    });
    expect(result.contributingEvidence.some((e) => e.source === "history")).toBe(true);
  });

  it("6. history absent contributes nothing from history", () => {
    const result = runCombinedAssessment({ symptom: symHealthy, image: null, history: null });
    expect(result.contributingEvidence.some((e) => e.source === "history")).toBe(false);
  });

  it("7. odd species does not crash pure engine (routing upstream)", () => {
    const result = runCombinedAssessment({
      symptom: symHealthy,
      image: null,
      history: { species: "Parrot", priorConditions: [], medicalHistory: [], allergies: [] }
    });
    expect(result.assessmentType).toBe("PRELIMINARY_AI_ASSESSMENT");
  });

  it("12. determinism identical inputs -> identical output", () => {
    const a = runCombinedAssessment({ symptom: symHealthy, image: imgFungal, history: null });
    const b = runCombinedAssessment({ symptom: symHealthy, image: imgFungal, history: null });
    expect(a).toEqual(b);
  });

  it("13. no path leakage in engine output", () => {
    const text = JSON.stringify(runCombinedAssessment({ symptom: symHealthy, image: imgFungal, history: null }));
    expect(text).not.toMatch(/\/tmp|\/Users|C:\\\\Users|checkpoints|\.pt|\.py/);
  });

  it("14. veterinarianReviewRequired always true across mixes", () => {
    expect(runCombinedAssessment({ symptom: symHealthy, image: null, history: null }).veterinarianReviewRequired).toBe(true);
    expect(runCombinedAssessment({ symptom: null, image: imgFungal, history: null }).veterinarianReviewRequired).toBe(true);
  });

  it("15. modality combined + versioned contract", () => {
    const result = runCombinedAssessment({ symptom: symFever, image: null, history: null });
    expect(result.modelModality).toBe("combined");
    expect(result.engineVersion).toMatch(/vetflow-ai-combined/);
    expect(result.contractVersion).toBe("1.0.0");
  });

  it("weights default + overridable", () => {
    const d = runCombinedAssessment({ symptom: symHealthy, image: null, history: null });
    expect(d.fusionWeights).toEqual(DEFAULT_FUSION_WEIGHTS);
    const c = runCombinedAssessment(
      { symptom: symHealthy, image: null, history: null },
      { symptom: 0.6, image: 0.3, history: 0.1 }
    );
    expect(c.fusionWeights.symptom).toBe(0.6);
  });
});
