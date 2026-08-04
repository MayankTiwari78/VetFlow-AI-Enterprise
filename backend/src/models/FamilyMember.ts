import mongoose, { type HydratedDocument, type Model } from "mongoose";

export interface FamilyMember {
  ownerPatientId: string;
  organizationId?: string;
  name: string;
  relationship: string;
  dob: string;
  phone?: string;
  email?: string;
  linkedAccountId?: string;
  consentScope: string;
  emergencyContact: boolean;
  demoSeedKey?: string;
  demoDataLabel?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FamilyMemberDocument = HydratedDocument<FamilyMember>;

const familyMemberSchema = new mongoose.Schema<FamilyMember>(
  {
    ownerPatientId: { type: String, required: true, index: true },
    organizationId: { type: String, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    relationship: { type: String, required: true, trim: true, maxlength: 80 },
    dob: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, maxlength: 40 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    linkedAccountId: { type: String },
    consentScope: {
      type: String,
      default: "Non-linked dependent/contact profile only. No medical-record access is granted."
    },
    emergencyContact: { type: Boolean, default: false },
    demoSeedKey: { type: String, index: true },
    demoDataLabel: { type: String }
  },
  { timestamps: true }
);

familyMemberSchema.index({ organizationId: 1, ownerPatientId: 1 });

const FamilyMemberModel =
  (mongoose.models.family_member as Model<FamilyMember> | undefined) ??
  mongoose.model<FamilyMember>("family_member", familyMemberSchema);

export default FamilyMemberModel;
