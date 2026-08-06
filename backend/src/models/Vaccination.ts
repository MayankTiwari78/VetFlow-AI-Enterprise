import mongoose, { type HydratedDocument, type Model } from "mongoose";

export interface Vaccination {
  petId: mongoose.Types.ObjectId;
  vaccineName: string;
  dueDate: Date;
  completedDate?: Date;
  nextDose?: Date;
  veterinarian?: mongoose.Types.ObjectId;
  notes: string;
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
    dueDate: { type: Date, required: true, index: true },
    completedDate: { type: Date, index: true },
    nextDose: { type: Date, index: true },
    veterinarian: { type: mongoose.Schema.Types.ObjectId, ref: "veterinarian", index: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" }
  },
  { timestamps: true }
);

vaccinationSchema.index({ petId: 1, dueDate: 1 });
vaccinationSchema.index({ petId: 1, completedDate: -1 });
vaccinationSchema.index({ veterinarian: 1, dueDate: 1 });

const VaccinationModel =
  (mongoose.models.vaccination as Model<Vaccination> | undefined) ??
  mongoose.model<Vaccination>("vaccination", vaccinationSchema);

export default VaccinationModel;
