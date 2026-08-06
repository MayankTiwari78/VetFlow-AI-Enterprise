import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const AI_REPORT_SEVERITIES = ["low", "moderate", "high", "urgent"] as const;
export type AiReportSeverity = (typeof AI_REPORT_SEVERITIES)[number];

export interface AIReport {
  petId: mongoose.Types.ObjectId;
  symptoms: string[];
  uploadedImages: string[];
  aiSummary: string;
  possibleConditions: string[];
  severity: AiReportSeverity;
  recommendations: string[];
  generatedAt: Date;
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
    generatedAt: { type: Date, required: true, default: Date.now, index: true }
  },
  { timestamps: true }
);

aiReportSchema.index({ petId: 1, generatedAt: -1 });
aiReportSchema.index({ severity: 1, generatedAt: -1 });

const AIReportModel =
  (mongoose.models.ai_report as Model<AIReport> | undefined) ??
  mongoose.model<AIReport>("ai_report", aiReportSchema);

export default AIReportModel;
