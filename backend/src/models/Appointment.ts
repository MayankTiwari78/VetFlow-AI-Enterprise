import mongoose, { type HydratedDocument, type Model } from "mongoose";

import type { DoctorSnapshot, UserProfileSnapshot } from "../types/domain.js";

export interface Appointment {
  userId: string;
  docId: string;
  slotDate: string;
  slotTime: string;
  userData: UserProfileSnapshot;
  docData: DoctorSnapshot;
  // Snapshot of the treated pet. Optional so that appointment documents created before the
  // pet-aware booking flow stay readable (they are never duplicated or migrated).
  petId?: string;
  petName?: string;
  amount: number;
  date: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  status: "scheduled" | "completed" | "cancelled";
  clinicalNotes?: string;
  clinicalNotesUpdatedAt?: Date;
  stripeSessionId?: string;
  razorpayOrderId?: string;
  organizationId?: string;
  demoSeedKey?: string;
  demoDataLabel?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AppointmentDocument = HydratedDocument<Appointment>;

const appointmentSchema = new mongoose.Schema<Appointment>(
  {
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: mongoose.Schema.Types.Mixed, required: true },
    docData: { type: mongoose.Schema.Types.Mixed, required: true },
    petId: { type: String, index: true },
    petName: { type: String },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
      index: true
    },
    clinicalNotes: { type: String, default: "", select: false },
    clinicalNotesUpdatedAt: { type: Date },
    stripeSessionId: { type: String },
    razorpayOrderId: { type: String },
    organizationId: { type: String, index: true },
    demoSeedKey: { type: String, index: true },
    demoDataLabel: { type: String }
  },
  { timestamps: true }
);

appointmentSchema.index({ userId: 1 });
appointmentSchema.index({ docId: 1 });
appointmentSchema.index({ userId: 1, petId: 1 });
appointmentSchema.index({ organizationId: 1, userId: 1 });
appointmentSchema.index({ organizationId: 1, docId: 1 });
appointmentSchema.index({ slotDate: 1, cancelled: 1, isCompleted: 1 });
appointmentSchema.index(
  { docId: 1, slotDate: 1, slotTime: 1 },
  { unique: true, partialFilterExpression: { status: "scheduled" } }
);

const AppointmentModel =
  (mongoose.models.appointment as Model<Appointment> | undefined) ??
  mongoose.model<Appointment>("appointment", appointmentSchema);

export default AppointmentModel;
