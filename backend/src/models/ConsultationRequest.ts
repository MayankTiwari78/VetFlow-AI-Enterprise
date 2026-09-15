import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const CONSULTATION_REQUEST_STATUSES = [
  "requested",
  "scheduled",
  "completed",
  "cancelled"
] as const;
export type ConsultationRequestStatus = (typeof CONSULTATION_REQUEST_STATUSES)[number];

/**
 * Stage 4 — Online Consultation Request foundation.
 *
 * Owners request a consultation with a veterinarian profile; a veterinarian
 * (or admin) transitions the explicit, auditable status. Identity is always
 * derived from the authenticated session — never from the client body.
 */
export interface ConsultationRequest {
  petId: mongoose.Types.ObjectId;
  /** Owner's user account id (patient) that requested the consultation. */
  requesterUserId: mongoose.Types.ObjectId;
  veterinarianId: mongoose.Types.ObjectId;
  reason: string;
  preferredDates?: string[];
  status: ConsultationRequestStatus;
  requestedAt: Date;
  decidedByAccountId?: string;
  decidedAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ConsultationRequestDocument = HydratedDocument<ConsultationRequest>;

const consultationRequestSchema = new mongoose.Schema<ConsultationRequest>(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "pet",
      required: true,
      index: true
    },
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true
    },
    veterinarianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "veterinarian",
      required: true,
      index: true
    },
    reason: { type: String, required: true, trim: true, maxlength: 3000 },
    preferredDates: { type: [String], default: [] },
    status: {
      type: String,
      enum: CONSULTATION_REQUEST_STATUSES,
      default: "requested",
      index: true
    },
    requestedAt: { type: Date, required: true, default: Date.now, index: true },
    decidedByAccountId: { type: String },
    decidedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 4000 }
  },
  { timestamps: true }
);

consultationRequestSchema.index({ petId: 1, requestedAt: -1 });
consultationRequestSchema.index({ veterinarianId: 1, status: 1, requestedAt: -1 });
consultationRequestSchema.index({ requesterUserId: 1, requestedAt: -1 });

const ConsultationRequestModel =
  (mongoose.models.consultation_request as Model<ConsultationRequest> | undefined) ??
  mongoose.model<ConsultationRequest>("consultation_request", consultationRequestSchema);

export default ConsultationRequestModel;