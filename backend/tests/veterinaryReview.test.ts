import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stage 4 — Veterinarian Review & Clinical Decision workflow tests.
 *
 * Service-level tests over veterinaryService using an in-memory fake of every
 * relevant Mongoose model. The fake storage simulates dotted-path `$set`
 * updates (like mongoose findByIdAndUpdate) so we can prove the immutable
 * review contract: decisions persist into `veterinarianReview` while the
 * original AI `prediction` / `combinedAssessment` / `imageAssessment` remain
 * byte-for-byte unchanged.
 *
 * Env defaults MUST be set before any module import (config/env.ts validates
 * process.env at import time).
 */
vi.hoisted(() => {
  const defaults: Record<string, string> = {
    NODE_ENV: "test",
    PORT: "4103",
    MONGODB_URI: "mongodb://127.0.0.1:27017/medflow-review-test",
    JWT_SECRET: "test-jwt-secret-with-enough-length",
    JWT_ACCESS_SECRET: "test-access-secret-with-enough-length",
    JWT_REFRESH_SECRET: "test-refresh-secret-with-enough-length",
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
    if (!process.env[key]) process.env[key] = value;
  }
});

const reportIds = {
  reportA: "507f191e810c19729de860b1",
  reportB: "507f191e810c19729de860b2",
  missing: "507f191e810c19729de860ff"
};
const animalIds = {
  petA: "507f191e810c19729de860a1",
  petB: "507f191e810c19729de860a2",
  ownerA: "507f191e810c19729de860e1",
  ownerB: "507f191e810c19729de860e2"
};
const vetActorIds = {
  patient: "507f191e810c19729de860f1",
  doctor: "507f191e810c19729de860f2",
  veterinarian: "507f191e810c19729de860c1",
  otherVeterinarian: "507f191e810c19729de860c2"
};

const PET_A_OWNED = animalIds.petA;
const PET_B_UNASSIGNED = animalIds.petB;

const AI_PREDICTION = {
  predictedCondition: "Fungal",
  modelProbability: 0.82,
  confidenceLevel: "High",
  topPredictions: [
    { condition: "Fungal", probability: 0.82 },
    { condition: "Ringworm", probability: 0.15 }
  ],
  probabilities: { Fungal: 0.82, Ringworm: 0.15 },
  explanation: { source: "vetflow-ml-v1.1.0-dev", disclaimer: "Preliminary only." }
};

const buildReport = (id: string, petId: string, overrides: Record<string, unknown> = {}) => ({
  _id: id,
  petId,
  symptoms: ["Fever", "Cough"],
  uploadedImages: [] as string[],
  aiSummary: "Preliminary AI assessment for Fungal with High confidence.",
  possibleConditions: ["Fungal", "Ringworm"],
  severity: "high",
  recommendations: ["Veterinarian review is required before any treatment decision."],
  generatedAt: new Date("2026-08-01T10:00:00.000Z"),
  veterinarianReviewStatus: "pending",
  modality: "combined",
  modelVersion: "vetflow-ai-combined-v1.0.0-dev",
  contractVersion: "1.0.0",
  prediction: AI_PREDICTION,
  combinedAssessment: {
    result: {
      predictedCondition: "Fungal",
      evidenceBand: "High",
      modalityDisagreement: false,
      engineVersion: "vetflow-ai-combined-v1.0.0-dev",
      contractVersion: "1.0.0"
    },
    inputs: {
      symptom: { condition: "Fungal", modelProbability: 0.72, confidenceLevel: "High" },
      image: {
        predictedClass: "fungal",
        band: "High",
        probability: 0.93,
        topConditions: [{ class: "fungal", probability: 0.93 }],
        modelVersion: "vetflow-cv-v2.0.0-dev"
      },
      history: { species: "Dog", breed: "Labrador", age: 4, priorConditions: ["Fungal"] }
    }
  },
  imageAssessment: undefined,
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  ...overrides
});

// ---------------------------------------------------------------------------
// In-memory fake Mongoose models with dotted-path `$set` support.
// ---------------------------------------------------------------------------
const fake = vi.hoisted(() => {
  const store = new Map<string, Map<string, Record<string, any>>>();

  const collection = (name: string): Map<string, Record<string, any>> => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name) as Map<string, Record<string, any>>;
  };

  const clone = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

  const matches = (doc: Record<string, any>, filter: Record<string, any> | undefined): boolean => {
    if (!filter) return true;
    return Object.entries(filter).every(([key, value]) => {
      if (key === "$and") {
        return (value as Record<string, any>[]).every((f) => matches(doc, f));
      }
      if (key === "$or") {
        return (value as Record<string, any>[]).some((f) => matches(doc, f));
      }
      const actual = doc[key];
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("$in" in value) return (value.$in as unknown[]).map(String).includes(String(actual));
        if ("$ne" in value) return String(actual) !== String(value.$ne);
        if ("$gte" in value) return Number(actual) >= Number(value.$gte);
        if ("$lte" in value) return Number(actual) <= Number(value.$lte);
        return matches(actual ?? {}, value);
      }
      return String(actual) === String(value);
    });
  };

  const applyDotted = (obj: Record<string, any>, key: string, value: unknown): void => {
    const parts = key.split(".");
    let cursor = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (typeof cursor[part] !== "object" || cursor[part] === null) cursor[part] = {};
      cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = clone(value);
  };

  const chain = (name: string, filter: Record<string, any> | undefined) => {
    const state: { sort?: Record<string, 1 | -1>; skip?: number; limit?: number } = {};
    const q = {
      sort(sort: Record<string, 1 | -1>) {
        state.sort = sort;
        return q;
      },
      skip(skip: number) {
        state.skip = skip;
        return q;
      },
      limit(limit: number) {
        state.limit = limit;
        return q;
      },
      select() {
        return q;
      },
      populate() {
        return q;
      },
      then(resolve: (items: unknown[]) => void) {
        let items = [...collection(name).values()].filter((doc) => matches(doc, filter));
        const [field, direction] = Object.entries(state.sort ?? {})[0] ?? [];
        if (field) {
          items.sort((a, b) => {
            const av = a[field]?.getTime?.() ?? a[field];
            const bv = b[field]?.getTime?.() ?? b[field];
            if (av === bv) return 0;
            const order = av < bv ? -1 : 1;
            return direction < 0 ? -order : order;
          });
        }
        const start = state.skip ?? 0;
        const end = state.limit ? start + state.limit : items.length;
        resolve(items.slice(start, end));
      }
    };
    return q;
  };

  type FakeDoc = Record<string, any>;

  /** Awaitable single-document query supporting populate()/select() no-ops. */
  const single = (getter: () => Record<string, any> | null) => {
    const q = {
      populate() {
        return q;
      },
      select() {
        return q;
      },
      then(
        resolve: (doc: Record<string, any> | null) => void,
        reject?: (error: unknown) => void
      ) {
        try {
          const doc = getter();
          resolve(doc ? (clone(doc) as Record<string, any>) : null);
        } catch (error) {
          reject?.(error);
        }
      }
    };
    return q;
  };

  // Class-based fake so `new Model({...}).save()` works like real mongoose.
  const modelFactory = (name: string) => {
    const coll = collection(name);

    class FakeModel {
      [key: string]: any;

      constructor(data: FakeDoc = {}) {
        Object.assign(this, clone(data));
        if (!this._id) this._id = `${name}-${coll.size + 1}`;
      }

      public async save(): Promise<FakeModel> {
        coll.set(String(this._id), clone(this as FakeDoc));
        return this;
      }

      public static findById(id: unknown) {
        return single(() => coll.get(String(id)) ?? null);
      }

      public static findOne(filter: Record<string, any>) {
        return single(() => [...coll.values()].find((doc) => matches(doc, filter)) ?? null);
      }

      public static find(filter: Record<string, any>) {
        return chain(name, filter);
      }

      public static async findByIdAndUpdate(
        id: unknown,
        update: Record<string, any>,
        _options?: unknown
      ) {
        const doc = coll.get(String(id));
        if (!doc) return null;
        const merged: Record<string, any> = clone(doc) as Record<string, any>;
        for (const [key, value] of Object.entries(update)) {
          applyDotted(merged, key, value);
        }
        merged.updatedAt = new Date("2026-08-02T10:00:00.000Z");
        coll.set(String(id), merged);
        return clone(merged);
      }

      public static async findOneAndUpdate(
        filter: Record<string, any>,
        update: Record<string, any>,
        options?: { upsert?: boolean }
      ) {
      let found = [...collection(name).values()].find((doc) => matches(doc, filter));
      if (!found && options?.upsert) {
        const seed: Record<string, any> = {};
        Object.entries(filter).forEach(([key, value]) => {
          if (value && typeof value === "object") return;
          seed[key] = value;
        });
        const next = { ...seed, ...clone(update.$setOnInsert ?? {}) };
        found = { _id: next._id ?? `${name}-new`, ...next };
        collection(name).set(String(found._id), found);
      }
          return found ? clone(found) : null;
      }

      public static async distinct(field: string, filter: Record<string, any>) {
        const values = new Set(
          [...coll.values()]
            .filter((doc) => matches(doc, filter))
            .map((doc) => String(doc[field]))
            .filter(Boolean)
        );
        return [...values];
      }

      public static async countDocuments(filter: Record<string, any>) {
        return [...coll.values()].filter((doc) => matches(doc, filter)).length;
      }

      public static async deleteOne(filter: Record<string, any>) {
        for (const [id, doc] of [...coll.entries()]) {
          if (matches(doc, filter)) coll.delete(id);
        }
      }

      public static create = async (data: FakeDoc): Promise<FakeDoc> => {
        const doc = new FakeModel(data);
        coll.set(String(doc._id), clone(doc as FakeDoc));
        return clone(doc as FakeDoc) as FakeDoc;
      };
    }

    return FakeModel;
  };

  const models: Record<string, ReturnType<typeof modelFactory>> = {};
  const reset = (): void => {
    // Clear in place so modelFactory instances that captured a live Map
    // reference (`coll`) keep pointing at the SAME store entry they write to.
    for (const values of store.values()) {
      values.clear();
    }
  };

  return {
    modelFactory,
    modelOf: new Proxy({} as Record<string, ReturnType<typeof modelFactory>>, {
      get: (_target, prop: string) => {
        if (!models[prop]) models[prop] = modelFactory(prop);
        return models[prop];
      }
    }),
    reset
  };
});

// Route every model import to the fake store.
vi.mock("../src/models/AIReport.js", () => ({
  default: fake.modelOf.ai_report,
  AI_REPORT_SEVERITIES: ["low", "moderate", "high", "urgent"],
  AI_REPORT_REVIEW_STATUSES: [
    "pending",
    "in_review",
    "reviewed",
    "approved",
    "modified",
    "dismissed",
    "consultation_required"
  ],
  AI_REVIEW_DECISIONS: ["in_review", "approve", "modify", "dismiss", "consultation_requested"]
}));
vi.mock("../src/models/Pet.js", () => ({ default: fake.modelOf.pet }));
vi.mock("../src/models/Doctor.js", () => ({ default: fake.modelOf.doctor }));
vi.mock("../src/models/Veterinarian.js", () => ({ default: fake.modelOf.veterinarian }));
vi.mock("../src/models/PetOwner.js", () => ({ default: fake.modelOf.pet_owner }));
vi.mock("../src/models/PetMedicalRecord.js", () => ({
  default: fake.modelOf.pet_medical_record
}));
vi.mock("../src/models/Vaccination.js", () => ({ default: fake.modelOf.vaccination }));
vi.mock("../src/models/User.js", () => ({ default: fake.modelOf.user }));
vi.mock("../src/models/VeterinaryPrescription.js", () => ({
  default: fake.modelOf.veterinary_prescription
}));
vi.mock("../src/models/ConsultationRequest.js", () => ({
  default: fake.modelOf.consultation_request
}));

const writeAuditLogMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../src/services/auditService.js", () => ({ writeAuditLog: writeAuditLogMock }));

import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/constants/rbac.js";
import { AppError } from "../src/utils/AppError.js";
import {
  createConsultationRequest,
  createVeterinaryPrescription,
  getVeterinarianReviewDetail,
  listVeterinarianReviewQueue,
  nearbyVeterinarians,
  updateAiReportReviewStatus,
  updateConsultationRequestStatus
} from "../src/services/veterinaryService.js";

const adminActor = {
  accountId: "admin@example.com",
  accountType: "admin" as const,
  role: "HOSPITAL_ADMIN" as const,
  permissions: [...ROLE_PERMISSIONS.HOSPITAL_ADMIN]
};
const doctorActor = {
  accountId: vetActorIds.doctor,
  accountType: "doctor" as const,
  role: "DOCTOR" as const,
  permissions: [...ROLE_PERMISSIONS.DOCTOR]
};
const patientActor = {
  accountId: vetActorIds.patient,
  accountType: "patient" as const,
  role: "PATIENT" as const,
  permissions: [...ROLE_PERMISSIONS.PATIENT]
};
// STAFF-like actor: authenticated but holds no review-related permissions.
const noPermissionsActor = {
  accountId: "507f191e810c19729de860ff",
  accountType: "patient" as const,
  role: "STAFF" as const,
  permissions: [] as typeof PERMISSIONS
};

const seedWorld = (): void => {
  fake.reset();
  writeAuditLogMock.mockClear();

  fake.modelOf.pet_owner.create({
    _id: animalIds.ownerA,
    userId: vetActorIds.patient
  });
  fake.modelOf.pet_owner.create({
    _id: animalIds.ownerB,
    userId: "507f191e810c19729de860f9"
  });
  fake.modelOf.pet.create({
    _id: PET_A_OWNED,
    name: "Rex",
    species: "Dog",
    breed: "Labrador",
    age: 4,
    ownerId: animalIds.ownerA
  });
  fake.modelOf.pet.create({
    _id: PET_B_UNASSIGNED,
    name: "Bella",
    species: "Cat",
    breed: "Siamese",
    age: 2,
    ownerId: animalIds.ownerB
  });
  fake.modelOf.veterinarian.create({
    _id: vetActorIds.veterinarian,
    doctorId: vetActorIds.doctor,
    clinicName: "MedFlow Clinic A",
    specialization: ["Veterinary Dermatology"],
    consultationFee: 500,
    consultationAvailable: true,
    availability: { enabled: true },
    location: { lat: 12.9716, lng: 77.5946, address: "Clinic A, Bengaluru" }
  });
  fake.modelOf.veterinarian.create({
    _id: vetActorIds.otherVeterinarian,
    doctorId: "507f191e810c19729de860f3",
    clinicName: "MedFlow Clinic B",
    specialization: ["Veterinary Surgery"],
    consultationFee: 800,
    consultationAvailable: true,
    availability: { enabled: true },
    location: { lat: 13.0827, lng: 80.2707, address: "Clinic B, Chennai" }
  });
  fake.modelOf.doctor.create({
    _id: vetActorIds.doctor,
    name: "Dr. Test Vet",
    email: "vet@example.com"
  });
  fake.modelOf.pet_medical_record.create({
    _id: "507f191e810c19729de860d1",
    petId: PET_A_OWNED,
    veterinarianId: vetActorIds.veterinarian,
    diagnosis: "dermatitis",
    symptoms: [],
    medications: [],
    prescriptions: [],
    treatment: "topical cream",
    laboratoryReports: [],
    attachments: [],
    visitDate: new Date("2026-07-01T10:00:00.000Z")
  });
  fake.modelOf.ai_report.create(buildReport(reportIds.reportA, PET_A_OWNED));
  fake.modelOf.ai_report.create(buildReport(reportIds.reportB, PET_B_UNASSIGNED));
};

const reportFromStore = (id: string): Promise<Record<string, any>> =>
  fake.modelOf.ai_report.findById(String(id)) as Promise<Record<string, any>>;

// A second veterinarian (doctorId ...f3) with no assignment to either pet.
const unassignedVetActor = {
  accountId: "507f191e810c19729de860f3",
  accountType: "doctor" as const,
  role: "DOCTOR" as const,
  permissions: [...ROLE_PERMISSIONS.DOCTOR]
};

type ReviewBody = Parameters<typeof updateAiReportReviewStatus>[2];

const reviewOf = (report: unknown): Record<string, any> =>
  ((report as { veterinarianReview?: Record<string, any> }).veterinarianReview ?? {});

const statusOf = (report: unknown): string =>
  String((report as { veterinarianReviewStatus?: string }).veterinarianReviewStatus ?? "");

describe("Stage 4 — veterinarian review workflow", () => {
  beforeEach(() => {
    seedWorld();
  });

  describe("authorization & report access control", () => {
    it("rejects an authenticated actor without review permissions", async () => {
      await expect(
        updateAiReportReviewStatus(noPermissionsActor, reportIds.reportA, {
          decision: "approve",
          finalAssessment: { condition: "Fungal infection" }
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("forbids a pet owner from submitting a veterinarian review", async () => {
      await expect(
        updateAiReportReviewStatus(patientActor, reportIds.reportA, {
          decision: "approve",
          finalAssessment: { condition: "Fungal infection" }
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("hides another owner's report from a patient (no cross-owner access)", async () => {
      await expect(
        getVeterinarianReviewDetail(patientActor, reportIds.reportB)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("hides unassigned reports from a veterinarian without pet assignment", async () => {
      await expect(
        updateAiReportReviewStatus(unassignedVetActor, reportIds.reportB, { decision: "dismiss" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 404 for a missing report", async () => {
      await expect(
        updateAiReportReviewStatus(adminActor, reportIds.missing, { decision: "dismiss" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("review queue & unified clinical workspace", () => {
    it("lists pending combined reports with pet information for admins", async () => {
      const queue = await listVeterinarianReviewQueue(adminActor, {});
      expect(queue.items as unknown[]).toHaveLength(2);
      expect(queue.pagination.total).toBe(2);
    });

    it("scopes the queue to assigned pets for a veterinarian", async () => {
      const queue = await listVeterinarianReviewQueue(doctorActor, {});
      const items = queue.items as Array<Record<string, any>>;
      expect(items).toHaveLength(1);
      expect(String(items[0]._id)).toBe(reportIds.reportA);
    });

    it("filters the queue by review status", async () => {
      await updateAiReportReviewStatus(doctorActor, reportIds.reportA, { decision: "dismiss" });
      const pending = await listVeterinarianReviewQueue(adminActor, { status: "pending" });
      expect(pending.items as unknown[]).toHaveLength(1);
      const dismissed = await listVeterinarianReviewQueue(adminActor, { status: "dismissed" });
      expect(dismissed.items as unknown[]).toHaveLength(1);
    });

    it("builds one unified workspace with the mandatory safety warning", async () => {
      const detail = await getVeterinarianReviewDetail(doctorActor, reportIds.reportA);
      expect(detail.safetyWarning).toBe(
        "This AI Report is a Preliminary Assessment and must not be considered a diagnosis."
      );
      expect(detail.report).toBeTruthy();
      // Combined report inputs include image evidence.
      expect(detail.hasImageEvidence).toBe(true);
    });

    it("marks symptom-only reports without image evidence", async () => {
      await fake.modelOf.ai_report.create(
        buildReport("507f191e810c19729de860b3", PET_A_OWNED, {
          modality: "symptom",
          combinedAssessment: undefined,
          imageAssessment: undefined
        })
      );
      const detail = await getVeterinarianReviewDetail(doctorActor, "507f191e810c19729de860b3");
      expect(detail.hasImageEvidence).toBe(false);
    });

    it("surfaces previous AI report conditions for the same pet", async () => {
      await fake.modelOf.ai_report.create(
        buildReport("507f191e810c19729de860b3", PET_A_OWNED, {
          modality: "symptom",
          combinedAssessment: undefined,
          imageAssessment: undefined
        })
      );
      const detail = await getVeterinarianReviewDetail(doctorActor, reportIds.reportA);
      expect(detail.previousReports as unknown[]).toHaveLength(1);
    });
  });

  describe("review lifecycle", () => {
    it("moves pending → in_review and records the previous status", async () => {
      const report = await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "in_review"
      });
      expect(statusOf(report)).toBe("in_review");
      const review = reviewOf(report);
      expect(review.startedAt).toBeTruthy();
      expect(review.previousStatus).toBe("pending");
      expect(review.decision).toBe("in_review");
      // Starting a review must NOT silently finalize a clinical assessment.
      expect(review.reviewedAt).toBeUndefined();
    });

    it("approves an AI report with a final veterinarian assessment", async () => {
      const report = await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "approve",
        notes: "Consistent with dermatophytosis on exam.",
        finalAssessment: {
          condition: "Dermatophytosis",
          diagnosis: "Superficial fungal skin infection",
          evidenceBand: "High",
          summary: "Start topical therapy and recheck in 2 weeks."
        }
      });
      expect(statusOf(report)).toBe("approved");
      const review = reviewOf(report);
      expect(review.decision).toBe("approve");
      expect(review.finalAssessment.condition).toBe("Dermatophytosis");
      expect(review.finalAssessment.diagnosis).toBe("Superficial fungal skin infection");
      expect(review.reviewedAt).toBeTruthy();
    });

    it("rejects approval without a final assessment (invalid payload)", async () => {
      await expect(
        updateAiReportReviewStatus(doctorActor, reportIds.reportA, { decision: "approve" })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("final veterinarian assessment")
      });
    });

    it("rejects an unknown decision value (invalid payload)", async () => {
      await expect(
        updateAiReportReviewStatus(
          doctorActor,
          reportIds.reportA,
          { decision: "delete-everything" } as unknown as ReviewBody
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejects an empty review payload", async () => {
      await expect(
        updateAiReportReviewStatus(doctorActor, reportIds.reportA, {})
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("records a modification/override of the AI assessment", async () => {
      const report = await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "modify",
        finalAssessment: { condition: "Bacterial pyoderma", evidenceBand: "Moderate" }
      });
      expect(statusOf(report)).toBe("modified");
      expect(reviewOf(report).finalAssessment.condition).toBe("Bacterial pyoderma");
      expect(reviewOf(report).decision).toBe("modify");
    });

    it("dismisses a report with veterinarian notes", async () => {
      const report = await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "dismiss",
        notes: "Transient finding; no clinical significance."
      });
      expect(statusOf(report)).toBe("dismissed");
      expect(reviewOf(report).decision).toBe("dismiss");
      expect(reviewOf(report).notes).toBe("Transient finding; no clinical significance.");
    });

    it("requires consultation and keeps the request note", async () => {
      const report = await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "consultation_requested",
        consultationRequestNote: "Book an in-person skin scrape."
      });
      expect(statusOf(report)).toBe("consultation_required");
      expect(reviewOf(report).consultationRequestNote).toBe("Book an in-person skin scrape.");
    });

    it("keeps the legacy reviewed status backward compatible", async () => {
      const report = await updateAiReportReviewStatus(adminActor, reportIds.reportA, {
        veterinarianReviewStatus: "reviewed"
      });
      expect(statusOf(report)).toBe("reviewed");
      expect(reviewOf(report).decision).toBe("approve");
    });

    it("derives the decision when only a legacy status is supplied", async () => {
      const report = await updateAiReportReviewStatus(adminActor, reportIds.reportA, {
        veterinarianReviewStatus: "dismissed"
      });
      expect(statusOf(report)).toBe("dismissed");
      expect(reviewOf(report).decision).toBe("dismiss");
    });
  });

  describe("auditability & AI immutability", () => {
    it("persists reviewer identity derived from the session (doctor)", async () => {
      const report = await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "approve",
        finalAssessment: { condition: "Dermatophytosis" }
      });
      const review = reviewOf(report);
      expect(review.veterinarianId).toBe(vetActorIds.veterinarian);
      expect(review.reviewerAccountId).toBe(vetActorIds.doctor);
      expect(review.reviewerAccountType).toBe("doctor");
      expect(review.reviewerName).toBe("Dr. Test Vet");
    });

    it("records Hospital Administrator for admin reviews (no client identity)", async () => {
      const report = await updateAiReportReviewStatus(adminActor, reportIds.reportA, {
        decision: "dismiss"
      });
      const review = reviewOf(report);
      expect(review.reviewerAccountType).toBe("admin");
      expect(review.reviewerName).toBe("Hospital Administrator");
      expect(review.veterinarianId).toBeNull();
    });

    it("never overwrites the original AI assessment and snapshots it", async () => {
      const before = await reportFromStore(reportIds.reportA);
      const aiBefore = JSON.stringify({
        prediction: before.prediction,
        combinedAssessment: before.combinedAssessment
      });

      await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "modify",
        notes: "Overriding the model output after physical exam.",
        finalAssessment: { condition: "Bacterial pyoderma" }
      });

      const after = await reportFromStore(reportIds.reportA);
      const aiAfter = JSON.stringify({
        prediction: after.prediction,
        combinedAssessment: after.combinedAssessment
      });

      expect(aiAfter).toBe(aiBefore);
      expect(after.veterinarianReview.aiPredictionSnapshot.predictedCondition).toBe("Fungal");
      expect(after.veterinarianReview.previousStatus).toBe("pending");
    });

    it("writes an audit event for every decision transition", async () => {
      await updateAiReportReviewStatus(doctorActor, reportIds.reportA, { decision: "in_review" });
      await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "approve",
        finalAssessment: { condition: "Dermatophytosis" }
      });
      const events = writeAuditLogMock.mock.calls.map(
        (call) => (call[0] as { eventType?: string })?.eventType
      );
      expect(events).toContain("ai_report.review_started");
            expect(events).toContain("ai_report.approved");
    });
  });

  describe("prescription foundation", () => {
    const prescriptionPayload = {
      medicineName: "Itraconazole",
      dosage: "5 mg/kg",
      frequency: "Once daily",
      duration: "14 days",
      route: "Oral",
      additionalInstructions: "Give with food."
    };

    it("lets the assigned veterinarian prescribe after approval", async () => {
      await updateAiReportReviewStatus(doctorActor, reportIds.reportA, {
        decision: "approve",
        finalAssessment: { condition: "Dermatophytosis" }
      });
      const prescription = (await createVeterinaryPrescription(
        doctorActor,
        reportIds.reportA,
        prescriptionPayload
      )) as Record<string, any>;
      expect(prescription.medicineName).toBe("Itraconazole");
      expect(prescription.dosage).toBe("5 mg/kg");
      expect(prescription.frequency).toBe("Once daily");
      expect(prescription.duration).toBe("14 days");
      expect(prescription.route).toBe("Oral");
      expect(prescription.veterinarianId).toBe(vetActorIds.veterinarian);
      expect(prescription.aiReportId).toBe(reportIds.reportA);
      expect(prescription.issuedByAccountId).toBe(vetActorIds.doctor);
      expect(prescription.reviewDecision).toBe("approve");
      expect(prescription.status).toBe("active");
      expect(prescription.issuedAt).toBeTruthy();
    });

    it("rejects prescriptions while the report is still pending (409)", async () => {
      await expect(
        createVeterinaryPrescription(doctorActor, reportIds.reportA, prescriptionPayload)
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("rejects prescriptions from non-veterinarians (403)", async () => {
      await expect(
        createVeterinaryPrescription(patientActor, reportIds.reportA, prescriptionPayload)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("rejects prescriptions from unassigned veterinarians (404)", async () => {
      await updateAiReportReviewStatus(adminActor, reportIds.reportB, {
        decision: "approve",
        finalAssessment: { condition: "Conjunctivitis" }
      });
      await expect(
                createVeterinaryPrescription(unassignedVetActor, reportIds.reportB, prescriptionPayload)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("online consultation foundation", () => {
    const consultationPayload = {
      petId: PET_A_OWNED,
      veterinarianId: vetActorIds.veterinarian,
      reason: "Lesion is spreading despite shampoo therapy.",
      preferredDates: ["2026-09-01T10:00:00.000Z"]
    };

    it("lets an owner request a consultation and records the requester", async () => {
      const request = (await createConsultationRequest(
        patientActor,
        consultationPayload
      )) as Record<string, any>;
      expect(request.status).toBe("requested");
      expect(request.requesterUserId).toBe(vetActorIds.patient);
      expect(request.veterinarianId).toBe(vetActorIds.veterinarian);
      expect(request.requestedAt).toBeTruthy();
    });

    it("lets the veterinarian transition the status auditable", async () => {
      const request = (await createConsultationRequest(
        patientActor,
        consultationPayload
      )) as Record<string, any>;
      const updated = (await updateConsultationRequestStatus(
        doctorActor,
        String(request._id),
        { status: "scheduled", notes: "Confirmed for Monday." }
      )) as Record<string, any>;
      expect(updated.status).toBe("scheduled");
      expect(updated.decidedByAccountId).toBe(vetActorIds.doctor);
      expect(updated.decidedAt).toBeTruthy();
      expect(updated.notes).toBe("Confirmed for Monday.");
    });

    it("forbids owners from changing consultation status", async () => {
      const request = (await createConsultationRequest(
        patientActor,
        consultationPayload
      )) as Record<string, any>;
      await expect(
        updateConsultationRequestStatus(patientActor, String(request._id), {
          status: "completed"
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("hides other veterinarians' consultation requests (404)", async () => {
      const request = (await createConsultationRequest(
        patientActor,
        consultationPayload
      )) as Record<string, any>;
      await expect(
        updateConsultationRequestStatus(unassignedVetActor, String(request._id), {
          status: "scheduled"
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("nearby veterinarian discovery", () => {
    it("returns real veterinarian profiles nearest-first", async () => {
      const results = (await nearbyVeterinarians(adminActor, {
        lat: 12.9716,
        lng: 77.5946
      })) as Array<Record<string, any>>;
      expect(results).toHaveLength(2);
      expect(results[0].veterinarianId).toBe(vetActorIds.veterinarian);
      expect(results[0].distanceKm).toBe(0);
      expect(results[1].distanceKm).toBeGreaterThan(0);
      expect(results[1].address).toBe("Clinic B, Chennai");
    });

    it("keeps veterinarians visible without injecting fake location data", async () => {
      const results = (await nearbyVeterinarians(adminActor, {})) as Array<Record<string, any>>;
      expect(results).toHaveLength(2);
      expect(results.every((item) => item.distanceKm === undefined)).toBe(true);
    });
  });

  describe("error hygiene", () => {
    it("never leaks stack traces, paths, or secrets in service errors", async () => {
      const attempts: Array<() => Promise<unknown>> = [
        () =>
          updateAiReportReviewStatus(adminActor, reportIds.missing, { decision: "dismiss" }),
        () => getVeterinarianReviewDetail(patientActor, reportIds.reportB),
        () =>
          createVeterinaryPrescription(doctorActor, reportIds.reportA, {
            medicineName: "X",
            dosage: "1",
            frequency: "1x",
            duration: "1d"
          }),
        () =>
          updateConsultationRequestStatus(doctorActor, reportIds.missing, {
            status: "scheduled"
          })
      ];
      const errors: Error[] = [];
      for (const attempt of attempts) {
        try {
          await attempt();
        } catch (error) {
          errors.push(error as Error);
        }
      }
      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors) {
        expect(error.message).not.toMatch(
          /node_modules|\\src\\|\/src\/|C:\\|process\.env|mongodb:\/\//
        );
        expect(error.message).not.toMatch(/^at /);
      }
    });
  });
});