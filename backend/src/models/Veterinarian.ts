import mongoose, { type HydratedDocument, type Model } from "mongoose";

import type { DoctorAvailability } from "../types/domain.js";

export interface Veterinarian {
  doctorId: mongoose.Types.ObjectId;
  specialization: string[];
  clinicName: string;
  yearsOfExperience: number;
  licenseNumber: string;
  consultationFee: number;
  availability: DoctorAvailability;
  /**
   * Stage 4 foundation — online consultation availability flag.
   * No fake data is hard-coded; it reflects veterinarian-set preferences only.
   */
  consultationAvailable?: boolean;
  /**
   * Stage 4 foundation — physical location used by the nearby-veterinarian
   * discovery boundary. Optional: when present it enables distance-based
   * ordering; when absent the service still returns real veterinarian
   * records (sorted by distance only when coordinates exist).
   */
  location?: {
    lat?: number;
    lng?: number;
    /** Human-readable clinic address shown in discovery results. */
    address?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export type VeterinarianDocument = HydratedDocument<Veterinarian>;

const availabilityDaySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    slots: { type: [String], default: [] }
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema<DoctorAvailability>(
  {
    enabled: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    consultationDurationMinutes: { type: Number, default: 30, min: 15, max: 120 },
    weeklySchedule: { type: [availabilityDaySchema], default: [] }
  },
  { _id: false }
);

const veterinarianSchema = new mongoose.Schema<Veterinarian>(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor",
      required: true,
      unique: true,
      index: true
    },
    specialization: { type: [String], default: [], index: true },
    clinicName: { type: String, required: true, trim: true, maxlength: 180, index: true },
    yearsOfExperience: { type: Number, required: true, min: 0 },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      unique: true,
      index: true
    },
    consultationFee: { type: Number, required: true, min: 0 },
    consultationAvailable: { type: Boolean, default: false },
    location: {
      type: new mongoose.Schema(
        {
          lat: { type: Number },
          lng: { type: Number },
          address: { type: String, trim: true, maxlength: 500 }
        },
        { _id: false }
      ),
      default: undefined
    },
    availability: { type: availabilitySchema, default: () => ({}) }
  },
  { timestamps: true }
);

veterinarianSchema.index({ clinicName: 1, specialization: 1 });

const VeterinarianModel =
  (mongoose.models.veterinarian as Model<Veterinarian> | undefined) ??
  mongoose.model<Veterinarian>("veterinarian", veterinarianSchema);

export default VeterinarianModel;
