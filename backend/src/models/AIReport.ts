import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const AI_REPORT_SEVERITIES = ["low", "moderate", "high", "urgent"] as const;
export type AiReportSeverity = (typeof AI_REPORT_SEVERITIES)[number];

export const AI_REPORT_REVIEW_STATUSES = ["pending", "reviewed", "dismissed"] as const;
export type AiReportReviewStatus = (typeof AI_REPORT_REVIEW_STATUSES)[number];

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
