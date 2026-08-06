import mongoose, { type HydratedDocument, type Model } from "mongoose";

export interface PetMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PetPrescription {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PetLaboratoryReport {
  title: string;
  reportType?: string;
  result?: string;
  fileUrl?: string;
  uploadedAt?: Date;
}

export interface PetRecordAttachment {
  fileName: string;
  fileUrl: string;
  fileType?: string;
  uploadedAt?: Date;
}

export interface PetMedicalRecord {
  petId: mongoose.Types.ObjectId;
  veterinarianId: mongoose.Types.ObjectId;
  diagnosis: string;
  symptoms: string[];
  medications: PetMedication[];
  prescriptions: PetPrescription[];
  treatment: string;
  laboratoryReports: PetLaboratoryReport[];
  attachments: PetRecordAttachment[];
  visitDate: Date;
  followUpDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PetMedicalRecordDocument = HydratedDocument<PetMedicalRecord>;

const medicationSchema = new mongoose.Schema<PetMedication>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    dosage: { type: String, required: true, trim: true, maxlength: 80 },
    frequency: { type: String, required: true, trim: true, maxlength: 80 },
    duration: { type: String, required: true, trim: true, maxlength: 80 },
    instructions: { type: String, trim: true, maxlength: 500 }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema<PetPrescription>(
  {
    medicationName: { type: String, required: true, trim: true, maxlength: 120 },
    dosage: { type: String, required: true, trim: true, maxlength: 80 },
    frequency: { type: String, required: true, trim: true, maxlength: 80 },
    duration: { type: String, required: true, trim: true, maxlength: 80 },
    instructions: { type: String, trim: true, maxlength: 500 }
  },
  { _id: false }
);

const laboratoryReportSchema = new mongoose.Schema<PetLaboratoryReport>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    reportType: { type: String, trim: true, maxlength: 120 },
    result: { type: String, trim: true, maxlength: 2000 },
    fileUrl: { type: String, trim: true },
    uploadedAt: { type: Date }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema<PetRecordAttachment>(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 180 },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { type: String, trim: true, maxlength: 120 },
    uploadedAt: { type: Date }
  },
  { _id: false }
);

const petMedicalRecordSchema = new mongoose.Schema<PetMedicalRecord>(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "pet",
      required: true,
      index: true
    },
    veterinarianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "veterinarian",
      required: true,
      index: true
    },
    diagnosis: { type: String, required: true, trim: true, maxlength: 2000 },
    symptoms: { type: [String], default: [] },
    medications: { type: [medicationSchema], default: [] },
    prescriptions: { type: [prescriptionSchema], default: [] },
    treatment: { type: String, required: true, trim: true, maxlength: 5000 },
    laboratoryReports: { type: [laboratoryReportSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    visitDate: { type: Date, required: true, default: Date.now, index: true },
    followUpDate: { type: Date, index: true }
  },
  { timestamps: true }
);

petMedicalRecordSchema.index({ petId: 1, visitDate: -1 });
petMedicalRecordSchema.index({ veterinarianId: 1, visitDate: -1 });
petMedicalRecordSchema.index({ petId: 1, followUpDate: 1 });

const PetMedicalRecordModel =
  (mongoose.models.pet_medical_record as Model<PetMedicalRecord> | undefined) ??
  mongoose.model<PetMedicalRecord>("pet_medical_record", petMedicalRecordSchema);

export default PetMedicalRecordModel;
