import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VeterinaryActor } from "../src/services/aiMlService.js";
import { AppError } from "../src/utils/AppError.js";

/**
 * Stage 2C AI image assessment unit tests.
 *
 * The Python bridge itself is exercised live (see manual smoke test); here we
 * verify the Node layer: species -> head selection policy, auth/access rules,
 * subprocess invocation, Stage 2C contract passthrough, temp-file cleanup and
 * failure handling.
 */

// Must run before module imports so config/env.ts validation succeeds even
// without an existing backend/.env on CI machines.
vi.hoisted(() => {
  const defaults: Record<string, string> = {
    NODE_ENV: "test",
    PORT: "4101",
    MONGODB_URI: "mongodb://127.0.0.1:27017/medflow-cv-test",
    JWT_SECRET: "test-jwt-secret-with-enough-length",
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN: "30d",
    CLIENT_URL: "http://localhost:5173",
    ADMIN_URL: "http://localhost:5174",
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD: "Password123",
    RAZORPAY_KEY_ID: "rzp_test",
    RAZORPAY_KEY_SECRET: "rzp_secret",
    STRIPE_SECRET_KEY: "sk_test_secret",
    LOG_LEVEL: "silent"
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
});

const childProcessMock = vi.hoisted(() => ({
  execFile: vi.fn()
}));

const fsPromisesMock = vi.hoisted(() => ({
  rm: vi.fn()
}));

// Partial mocks keep sibling exports (aiMlService uses exec at module scope).
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, execFile: childProcessMock.execFile };
});
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, default: { ...(actual.default ?? {}), rm: fsPromisesMock.rm } };
});
const petFindByIdMock = vi.fn();

vi.mock("../src/models/Pet.js", () => ({
  default: {
    findById: (...args: unknown[]) => petFindByIdMock(...args)
  }
}));

const assertPetAccessMock = vi.fn();

// Partial mock: cvImageService imports assertPetAccess from aiMlService, whose
// real implementation hits unrelated Mongoose models. Ownership rules are the
// caller's concern here; they are covered by app.test.ts end-to-end.
vi.mock("../src/services/aiMlService.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/aiMlService.js")>()),
  assertPetAccess: (...args: unknown[]) => assertPetAccessMock(...args)
}));

// saveAiImageReport delegates ownership + persistence to the shared
// createAiReport service; mock it so we can assert the mapped report payload
// (history/review integration) without a database.
const createAiReportMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/veterinaryService.js", () => ({
  createAiReport: createAiReportMock
}));

const AI_INFERENCE_ERROR = "AI image assessment failed while analysing this image.";



import {
  CV_SUPPORTED_SPECIES,
  SPECIES_TO_CV_HEAD,
  headKeyForSpecies,
  runAiImagePrediction,
  saveAiImageReport
} from "../src/services/cvImageService.js";

/** Full Stage 2C response contract, exactly as produced by HeadPredictor. */
const STAGE_2C_CONTRACT = {
  modelModality: "image",
  assessmentType: "PRELIMINARY_AI_ASSESSMENT",
  veterinarianReviewRequired: true,
  disclaimer:
    "This is a PRELIMINARY AI ASSESSMENT generated from a single image by an " +
    "experimental prototype model trained on public, uploader-licensed datasets. " +
    "It is NOT a diagnosis and MUST NOT be used for treatment decisions. " +
    "Veterinarian review is required.",
  imageFindings: {
    head_key: "dog_derm_coarse",
    predicted_class: "fungal",
    probabilities: { healthy: 0.05, fungal: 0.93, parasitic_mange: 0.02 },
    top_conditions: [
      { class: "fungal", probability: 0.93 },
      { class: "healthy", probability: 0.05 },
      { class: "parasitic_mange", probability: 0.02 }
    ],
    calibrated: true,
    temperature: 1.251358,
    model_version: "vetflow-cv-v2.0.0-dev",
    backbone: "mobilenet_v2",
    mode: "finetune"
  },
  imageConfidence: { band: "High", probability: 0.93 }
};

const fileStub = {
  fieldname: "image",
  originalname: "skin.jpg",
  mimetype: "image/jpeg",
  size: 1024,
  path: "/tmp/vetflow-cv-test-input.jpg"
};

beforeEach(() => {
  childProcessMock.execFile.mockReset();
  fsPromisesMock.rm.mockReset();
  fsPromisesMock.rm.mockResolvedValue(undefined);
  petFindByIdMock.mockReset();
  assertPetAccessMock.mockReset();
  assertPetAccessMock.mockResolvedValue(undefined);
  createAiReportMock.mockReset();
});

describe("headKeyForSpecies — Stage 2C head selection policy", () => {
  it("maps dogs to the production coarse canine dermatology head", () => {
    expect(headKeyForSpecies("Dog")).toBe(SPECIES_TO_CV_HEAD.dog);
    expect(headKeyForSpecies("Canine")).toBe("dog_derm_coarse");
  });

  it("maps cats to the feline dermatology head", () => {
    expect(headKeyForSpecies("cat")).toBe("cat_derm");
    expect(headKeyForSpecies("Feline")).toBe("cat_derm");
  });

  it("maps cattle variants onto the lumpy skin disease head", () => {
    for (const species of ["cattle", "Cow", "BOVINE"]) {
      expect(headKeyForSpecies(species)).toBe("cattle_lumpy");
    }
  });

  it("trims whitespace and normalises case", () => {
    expect(headKeyForSpecies("  Dog  ")).toBe("dog_derm_coarse");
  });

  it("returns null (not a guess) for unsupported or missing species", () => {
    expect(headKeyForSpecies("parrot")).toBeNull();
    expect(headKeyForSpecies("")).toBeNull();
    expect(headKeyForSpecies(undefined)).toBeNull();
    expect(headKeyForSpecies(null)).toBeNull();
  });

  it("exposes only the three supported canonical species", () => {
    expect([...CV_SUPPORTED_SPECIES].sort()).toEqual(["cat", "cattle", "dog"]);
  });
});

const actor: VeterinaryActor = {
  accountId: "account-1",
  accountType: "patient",
  role: "ORGANIZATION_MEMBER",
  permissions: ["users:manage"]
};

describe("runAiImagePrediction", () => {
  const chainablePet = (doc: Record<string, unknown>) => ({
    ...doc,
    select: () => Promise.resolve(doc),
    then: (
      resolve?: (value: unknown) => void,
      reject?: (reason?: unknown) => void
    ) => Promise.resolve(doc).then(resolve, reject),
    catch: (reject?: (reason?: unknown) => void) => Promise.resolve(doc).catch(reject)
  });

  const dogDocument = chainablePet({ _id: "pet-1", species: "Dog", name: "Rex" });

  it("requires an uploaded file", async () => {
    await expect(
      runAiImagePrediction(actor, { petId: "507f191e810c19729de860ea" } as never)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(petFindByIdMock).not.toHaveBeenCalled();
  });

  it("refuses unsupported species with a clear availability error instead of guessing", async () => {
    petFindByIdMock.mockReturnValue(chainablePet({ _id: "pet-1", species: "Parrot", name: "Kiwi" }));

    await expect(
      runAiImagePrediction(actor, { petId: "507f191e810c19729de860ea", file: fileStub } as never)
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining("AI image assessment unavailable")
    });
    expect(childProcessMock.execFile).not.toHaveBeenCalled();
    // Temp upload must still be cleaned up on the failure path.
    expect(fsPromisesMock.rm).toHaveBeenCalledTimes(1);
  });

  it("runs the bridge for the selected pet's species head and passes the Stage 2C contract through unchanged", async () => {
    petFindByIdMock.mockReturnValue(dogDocument);

    let invokedCommand = "";
    let invokedArgs: string[] = [];
    childProcessMock.execFile.mockImplementation(
      (
        command: string,
        args: readonly string[],
        _options: unknown,
        callback: (error: null, result: { stdout: string; stderr: string }) => void
      ) => {
        invokedCommand = command;
        invokedArgs = [...args];
        callback(null, {
          stdout: JSON.stringify({ success: true, data: STAGE_2C_CONTRACT }),
          stderr: ""
        });
      }
    );

    const prediction = (await runAiImagePrediction(actor, {
      petId: "507f191e810c19729de860ea",
      file: fileStub
    } as never)) as Record<string, unknown>;

    expect(invokedCommand.replace(/^.*[/\\]/u, "")).toMatch(/^python(\.exe)?$/iu);
    expect(invokedArgs[0]).toMatch(/ml[/\\]cv_predict_bridge\.py$/u);
    expect(invokedArgs[1]).toBe(fileStub.path);
    expect(invokedArgs[2]).toBe("dog_derm_coarse");

    // Contract fields pass through untouched — safety language cannot be weakened here.
    expect(prediction.modelModality).toBe("image");
    expect(prediction.assessmentType).toBe("PRELIMINARY_AI_ASSESSMENT");
    expect(prediction.veterinarianReviewRequired).toBe(true);
    expect((prediction.imageConfidence as Record<string, unknown>).band).toBe("High");
    expect(String(prediction.disclaimer)).toContain("Veterinarian review is required");
    expect(String(prediction.disclaimer)).toContain("NOT");
    expect((prediction.imageFindings as Record<string, unknown>).model_version).toBe(
      "vetflow-cv-v2.0.0-dev"
    );

    // Temp upload removed exactly once with its resolved path.
    expect(fsPromisesMock.rm).toHaveBeenCalledWith(expect.stringMatching(/cv-test-input\.jpg$/u), {
      force: true
    });
  });

  it("surfaces controlled bridge failures as 502 errors", async () => {
    petFindByIdMock.mockReturnValue(dogDocument);
    childProcessMock.execFile.mockImplementation(
      (
        _command: string,
        _args: readonly string[],
        _options: unknown,
        callback: (error: null, result: { stdout: string; stderr: string }) => void
      ) => {
        callback(null, { stdout: JSON.stringify({ success: false, error: AI_INFERENCE_ERROR }), stderr: "" });
      }
    );

    await expect(
      runAiImagePrediction(actor, { petId: "507f191e810c19729de860ea", file: fileStub } as never)
    ).rejects.toMatchObject({ statusCode: 502, message: AI_INFERENCE_ERROR });
    expect(fsPromisesMock.rm).toHaveBeenCalledTimes(1);
  });

  it("treats unparseable bridge output as an inference failure (502)", async () => {
    petFindByIdMock.mockReturnValue(dogDocument);
    childProcessMock.execFile.mockImplementation(
      (
        _command: string,
        _args: readonly string[],
        _options: unknown,
        callback: (error: null, result: { stdout: string; stderr: string }) => void
      ) => {
        callback(null, { stdout: "Traceback (most recent call last)...", stderr: "" });
      }
    );

    await expect(
      runAiImagePrediction(actor, { petId: "507f191e810c19729de860ea", file: fileStub } as never)
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(fsPromisesMock.rm).toHaveBeenCalledTimes(1);
  });

  it("reports a missing inference engine as temporarily unavailable (503)", async () => {
    petFindByIdMock.mockReturnValue(dogDocument);
    childProcessMock.execFile.mockImplementation(
      (
        _command: string,
        _args: readonly string[],
        _options: unknown,
        callback: (error: Error & { code?: string }, _stdout: string, _stderr: string) => void
      ) => {
        const spawnError = Object.assign(new Error("spawn python ENOENT"), { code: "ENOENT", errno: -4058 });
        callback(spawnError, "", "");
      }
    );

    await expect(
      runAiImagePrediction(actor, { petId: "507f191e810c19729de860ea", file: fileStub } as never)
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fsPromisesMock.rm).toHaveBeenCalledTimes(1);
  });

  it("propagates pet-access failures untouched after cleaning up the temp upload", async () => {
    petFindByIdMock.mockReturnValue(dogDocument);
    assertPetAccessMock.mockRejectedValue(new AppError("Forbidden", 403));

    await expect(
      runAiImagePrediction(actor, { petId: "507f191e810c19729de860ea", file: fileStub } as never)
    ).rejects.toMatchObject({ statusCode: 403, message: "Forbidden" });
    // Bridge must never be reached once access control fails.
    expect(childProcessMock.execFile).not.toHaveBeenCalled();
    // Temp upload still cleaned up on the failure path.
    expect(fsPromisesMock.rm).toHaveBeenCalledTimes(1);
  });
});

describe("saveAiImageReport — persistence into shared AI Health Reports history", () => {
  const payload = { petId: "507f191e810c19729de860ea", file: fileStub };

  it("persists a mapped image assessment report", async () => {
    createAiReportMock.mockResolvedValue({ _id: "report-1" });

    const report = await saveAiImageReport(actor, payload as never, STAGE_2C_CONTRACT);
    expect(createAiReportMock).toHaveBeenCalledTimes(1);

    const mapped = createAiReportMock.mock.calls[0][1] as Record<string, any>;
    // Assessment classification + type (image vs symptom).
    expect(mapped.modality).toBe("image");
    expect(mapped.petId).toBe(payload.petId);

    // Shared required fields satisfied so list/detail/review work unchanged.
    expect(String(mapped.aiSummary)).toContain("Preliminary AI image assessment");
    expect(String(mapped.aiSummary)).toContain("computer-vision");
    expect(String(mapped.aiSummary)).toContain("Veterinarian review is required");
    expect(mapped.severity).toBe("high"); // High band -> high
    expect(mapped.veterinarianReviewStatus).toBe("pending");
    expect(mapped.modelVersion).toBe("vetflow-cv-v2.0.0-dev");

    // Structured prediction mapping (compatible with existing consumers).
    expect(mapped.prediction.predictedCondition).toBe("fungal");
    expect(mapped.prediction.modelProbability).toBe(0.93);
    expect(mapped.prediction.confidenceLevel).toBe("High");
    expect(mapped.prediction.topPredictions[0]).toEqual({
      condition: "fungal",
      probability: 0.93
    });
    expect(mapped.prediction.probabilities).toEqual({
      healthy: 0.05,
      fungal: 0.93,
      parasitic_mange: 0.02
    });

    // Full Stage 2C contract retained for detail/review rendering.
    expect(mapped.imageAssessment).toEqual(STAGE_2C_CONTRACT);

    // No file/temp path persisted; no uploaded-images duplication.
    expect(mapped.uploadedImages).toEqual([]);
    expect(mapped.symptoms).toEqual([]);
    const serialized = JSON.stringify(mapped);
    expect(serialized).not.toMatch(/\/tmp|\/Users|C:\\Users|\.jpg|\.png/);
  });

  it("maps a Moderate band to moderate severity and persists full breakdown", async () => {
    createAiReportMock.mockResolvedValue({ _id: "report-2" });
    const moderateContract = {
      ...STAGE_2C_CONTRACT,
      imageConfidence: { band: "Moderate", probability: 0.54 }
    };

    await saveAiImageReport(actor, payload as never, moderateContract);
    const mapped = createAiReportMock.mock.calls[0][1] as Record<string, any>;
    expect(mapped.severity).toBe("moderate");
    expect(mapped.prediction.modelProbability).toBe(0.54);
  });

  it("preserves the preliminary / non-diagnostic safety language", async () => {
    createAiReportMock.mockResolvedValue({ _id: "report-3" });
    await saveAiImageReport(actor, payload as never, STAGE_2C_CONTRACT);
    const mapped = createAiReportMock.mock.calls[0][1] as Record<string, any>;
    const text = JSON.stringify(mapped);
    expect(text).toContain("not a clinical diagnosis");
    expect(text).toContain("Veterinarian review is required");
    expect(mapped.imageAssessment).toBeDefined();
  });

  it("does not weaken or omit the required veterinarian-review flag", async () => {
    createAiReportMock.mockResolvedValue({ _id: "report-4" });
    await saveAiImageReport(actor, payload as never, STAGE_2C_CONTRACT);
    const mapped = createAiReportMock.mock.calls[0][1] as Record<string, any>;
    expect(mapped.imageAssessment.veterinarianReviewRequired).toBe(true);
    expect(mapped.veterinarianReviewStatus).toBe("pending");
  });
});
