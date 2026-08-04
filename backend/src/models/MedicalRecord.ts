import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const MEDICAL_RECORD_TYPES = [
  "consultation_summary",
  "diagnosis_history",
  "allergy_update",
  "vaccination_record",
  "report_metadata",
  "treatment_plan",
  "prescription_plan"
] as const;

export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

export const MEDICAL_RECORD_STATUSES = ["draft", "finalized"] as const;
export type MedicalRecordStatus = (typeof MEDICAL_RECORD_STATUSES)[number];

export interface MedicalRecordAuthor {
  accountType: "doctor" | "admin";
  accountId: string;
  displayName: string;
}

export interface MedicalRecord {
  patientId: string;
  appointmentId?: string;
  organizationId?: string;
  type: MedicalRecordType;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  status: MedicalRecordStatus;
  patientVisible: boolean;
  author: MedicalRecordAuthor;
  finalizedAt?: Date;
  demoSeedKey?: string;
  demoDataLabel?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MedicalRecordDocument = HydratedDocument<MedicalRecord>;

const medicalRecordSchema = new mongoose.Schema<MedicalRecord>(
  {
    patientId: { type: String, required: true, index: true },
    appointmentId: { type: String, index: true },
    organizationId: { type: String, index: true },
    type: { type: String, enum: MEDICAL_RECORD_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    summary: { type: String, required: true, trim: true, maxlength: 2000 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: MEDICAL_RECORD_STATUSES, default: "draft", index: true },
    patientVisible: { type: Boolean, default: false, index: true },
    author: {
      accountType: { type: String, enum: ["doctor", "admin"], required: true },
      accountId: { type: String, required: true },
      displayName: { type: String, required: true, trim: true }
    },
    finalizedAt: { type: Date },
    demoSeedKey: { type: String, index: true },
    demoDataLabel: { type: String }
  },
  { minimize: false, timestamps: true }
);

medicalRecordSchema.index({ organizationId: 1, patientId: 1, status: 1, patientVisible: 1 });
medicalRecordSchema.index({ organizationId: 1, appointmentId: 1 });

const MedicalRecordModel =
  (mongoose.models.medical_record as Model<MedicalRecord> | undefined) ??
  mongoose.model<MedicalRecord>("medical_record", medicalRecordSchema);

export default MedicalRecordModel;
