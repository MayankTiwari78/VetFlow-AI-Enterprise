import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const VACCINATION_STATUSES = [
  "up-to-date",
  "due-soon",
  "overdue",
  "completed",
  "cancelled"
] as const;

export type VaccinationStatus = (typeof VACCINATION_STATUSES)[number];

export const VACCINATION_CATEGORIES = [
  "Core",
  "Non-Core",
  "Bordetella",
  "Rabies",
  "Leptospirosis",
  "Heartworm",
  "Parasite Prevention"
] as const;

export const VACCINATION_ROUTES = [
  "Subcutaneous",
  "Intramuscular",
  "Intradermal",
  "Oral",
  "Intranasal"
] as const;

export interface Vaccination {
  petId: mongoose.Types.ObjectId;
  vaccineName: string;
  category: string;
  dueDate: Date;
  completedDate?: Date;
  nextDose?: Date;
  dose: string;
  route: string;
  veterinarian?: mongoose.Types.ObjectId;
  clinic: string;
  manufacturer: string;
  batchNumber: string;
  certificate?: string;
  notes: string;
  status: VaccinationStatus;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type VaccinationDocument = HydratedDocument<Vaccination>;

const vaccinationSchema = new mongoose.Schema<Vaccination>(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "pet",
      required: true,
      index: true
    },
    vaccineName: { type: String, required: true, trim: true, maxlength: 160, index: true },
    category: { type: String, trim: true, maxlength: 80, default: "Core", index: true },
    dueDate: { type: Date, required: true, index: true },
    completedDate: { type: Date, index: true },
    nextDose: { type: Date, index: true },
    dose: { type: String, trim: true, maxlength: 80, default: "" },
    route: { type: String, trim: true, maxlength: 80, default: "" },
    veterinarian: { type: mongoose.Schema.Types.ObjectId, ref: "veterinarian", index: true },
    clinic: { type: String, trim: true, maxlength: 180, default: "" },
    manufacturer: { type: String, trim: true, maxlength: 160, default: "" },
    batchNumber: { type: String, trim: true, maxlength: 120, default: "" },
    certificate: { type: String, trim: true, maxlength: 2000, default: "" },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: VACCINATION_STATUSES,
      default: "up-to-date",
      index: true
    },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

vaccinationSchema.index({ petId: 1, dueDate: 1 });
vaccinationSchema.index({ petId: 1, completedDate: -1 });
vaccinationSchema.index({ veterinarian: 1, dueDate: 1 });
vaccinationSchema.index({ petId: 1, isDeleted: 1, status: 1 });
vaccinationSchema.index({ petId: 1, isDeleted: 1, nextDose: 1 });

const VaccinationModel =
  (mongoose.models.vaccination as Model<Vaccination> | undefined) ??
  mongoose.model<Vaccination>("vaccination", vaccinationSchema);

export default VaccinationModel;
