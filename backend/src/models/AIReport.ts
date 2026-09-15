import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const AI_REPORT_SEVERITIES = ["low", "moderate", "high", "urgent"] as const;
export type AiReportSeverity = (typeof AI_REPORT_SEVERITIES)[number];

/**
 * Stage 4 veterinarian-review lifecycle.
 *
 * Backward compatible superset of the original Stage 1 enum:
 * - legacy values `pending` / `reviewed` / `dismissed` are preserved so
 *   existing reports and consumers keep working unchanged;
 * - Stage 4 adds explicit `in_review`, `approved`, `modified` and
 *   `consultation_required` states.
 */
export const AI_REPORT_REVIEW_STATUSES = [
  "pending",
  "in_review",
  "reviewed",
  "approved",
  "modified",
  "dismissed",
  "consultation_required"
] as const;
export type AiReportReviewStatus = (typeof AI_REPORT_REVIEW_STATUSES)[number];

/** Explicit veterinarian decision recorded alongside every terminal review. */
export const AI_REVIEW_DECISIONS = [
  "in_review",
  "approve",
  "modify",
  "dismiss",
  "consultation_requested"
] as const;
export type AiReviewDecision = (typeof AI_REVIEW_DECISIONS)[number];

export interface AiReviewFinalAssessment {
  /** Final clinical condition determined by the veterinarian. */
  condition: string;
  /** Optional clinical diagnosis wording chosen by the veterinarian. */
  diagnosis?: string;
  /** Evidence band the veterinarian associates with the final assessment. */
  evidenceBand?: string;
  /** Optional short clinical summary. */
  summary?: string;
}

/**
 * Stage 4 — immutable veterinary review record.
 *
 * This is the auditable complement to the (unchanged) AI assessment. The
 * original AI `prediction` / `combinedAssessment` / `imageAssessment` fields
 * are NEVER overwritten: everything the veterinarian decided lives here.
 */
export interface VeterinarianReview {
  /** Veterinary (doctor) profile that performed the review. */
  veterinarianId?: mongoose.Types.ObjectId;
  /** Authenticated account that performed the review (never client-supplied). */
  reviewerAccountId?: string;
  reviewerAccountType?: "patient" | "doctor" | "admin";
  reviewerName?: string;
  startedAt?: Date;
  reviewedAt?: Date;
  /** Status right before this review (auditability: previous status). */
  previousStatus?: string;
  decision?: AiReviewDecision;
  status?: AiReportReviewStatus;
  notes?: string;
  consultationRequestNote?: string;
  /** Final veterinarian assessment — separate from the AI prediction. */
  finalAssessment?: AiReviewFinalAssessment;
  /**
   * Frozen copy of what the AI predicted at review time, so the audit trail
   * always shows exactly what the model said even if the doc is later edited.
   * Never used to replace the authoritative AI prediction fields.
   */
  aiPredictionSnapshot?: {
    predictedCondition: string;
    modelProbability: number;
    confidenceLevel: string;
    modality?: string;
  };
}

export interface AIReport {
  petId: mongoose.Types.ObjectId;
  symptoms: string[];
  uploadedImages: string[];
  aiSummary: string;
  possibleConditions: string[];
  severity: AiReportSeverity;
  recommendations: string[];
  generatedAt: Date;
  veterinarianReviewStatus: AiReportReviewStatus;
  /** Stage 4 immutable veterinary review record (see VeterinarianReview). */
  veterinarianReview?: VeterinarianReview;
  modelVersion: string;
  contractVersion: string;
  /**
   * Assessment modality. Existing symptom-based reports default to "symptom";
   * Stage 2C image assessments are persisted as "image". Kept optional so the
   * historical symptom reports remain unchanged.
   */
  modality?: "symptom" | "image" | "combined";
  /**
   * Full Stage 3 combined assessment (fusion result + normalized inputs) for
   * combined-modality reports. Absent on symptom/image reports.
   */
  combinedAssessment?: {
    result: Record<string, unknown>;
    inputs: Record<string, unknown>;
  };
  /**
   * Full Stage 2C structured contract for image assessments
   * (modelModality / assessmentType / veterinarianReviewRequired / disclaimer /
   * imageFindings / imageConfidence). Absent on symptom reports.
   */
  imageAssessment?: Record<string, unknown>;
  prediction: {
    predictedCondition: string;
    modelProbability: number;
    confidenceLevel: string;
    topPredictions: Array<{ condition: string; probability: number }>;
    probabilities: Record<string, number>;
    explanation: Record<string, unknown>;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export type AIReportDocument = HydratedDocument<AIReport>;

const aiReportSchema = new mongoose.Schema<AIReport>(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "pet",
      required: true,
      index: true
    },
    symptoms: { type: [String], default: [] },
    uploadedImages: { type: [String], default: [] },
    aiSummary: { type: String, required: true, trim: true, maxlength: 4000 },
    possibleConditions: { type: [String], default: [] },
    severity: {
      type: String,
      enum: AI_REPORT_SEVERITIES,
      required: true,
      index: true
    },
    recommendations: { type: [String], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
    veterinarianReviewStatus: {
      type: String,
      enum: AI_REPORT_REVIEW_STATUSES,
      default: "pending",
      index: true
    },
    // Stage 4 — immutable veterinary review record. Everything the
    // veterinarian decided lives here; the original AI prediction /
    // combinedAssessment / imageAssessment fields are never modified.
    veterinarianReview: {
      type: new mongoose.Schema(
        {
          veterinarianId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "veterinarian"
          },
          reviewerAccountId: { type: String },
          reviewerAccountType: { type: String, enum: ["patient", "doctor", "admin"] },
          reviewerName: { type: String, trim: true, maxlength: 240 },
          startedAt: { type: Date },
          reviewedAt: { type: Date },
          previousStatus: { type: String },
          decision: { type: String, enum: AI_REVIEW_DECISIONS },
          status: { type: String, enum: AI_REPORT_REVIEW_STATUSES },
          notes: { type: String, trim: true, maxlength: 5000 },
          consultationRequestNote: { type: String, trim: true, maxlength: 5000 },
          finalAssessment: {
            type: new mongoose.Schema(
              {
                condition: { type: String, trim: true, maxlength: 240 },
                diagnosis: { type: String, trim: true, maxlength: 2000 },
                evidenceBand: { type: String, trim: true, maxlength: 40 },
                summary: { type: String, trim: true, maxlength: 4000 }
              },
              { _id: false }
            ),
            default: undefined
          },
          aiPredictionSnapshot: {
            type: new mongoose.Schema(
              {
                predictedCondition: { type: String, default: "" },
                modelProbability: { type: Number, default: 0 },
                confidenceLevel: { type: String, default: "" },
                modality: { type: String, default: "" }
              },
              { _id: false }
            ),
            default: undefined
          }
        },
        { _id: false }
      ),
      default: undefined
    },
    // "symptom" (existing, default), "image" (Stage 2C), or "combined" (Stage 3).
    // Historical symptom reports are stored without this field and default to "symptom".
    modality: {
      type: String,
      enum: ["symptom", "image", "combined"],
      default: "symptom",
      index: true
    },
    // Full Stage 3 combined assessment (fusion result + normalized inputs).
    // Absent (undefined) on symptom/image reports for backward compatibility.
    combinedAssessment: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    },
    // Full Stage 2C structured contract persisted on image assessments.
    // Absent (undefined) on symptom reports for backward compatibility.
    imageAssessment: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    },
    modelVersion: { type: String, default: "vetflow-ml-v1.1.0-dev" },
    contractVersion: { type: String, default: "1.0.0" },
    prediction: {
      predictedCondition: { type: String, default: "" },
      modelProbability: { type: Number, default: 0 },
      confidenceLevel: { type: String, default: "Low" },
      topPredictions: { type: [Object], default: [] },
      probabilities: { type: Object, default: {} },
      explanation: { type: Object, default: {} }
    }
  },
  { timestamps: true }
);

aiReportSchema.index({ petId: 1, generatedAt: -1 });
aiReportSchema.index({ severity: 1, generatedAt: -1 });

const AIReportModel =
  (mongoose.models.ai_report as Model<AIReport> | undefined) ??
  mongoose.model<AIReport>("ai_report", aiReportSchema);

export default AIReportModel;
