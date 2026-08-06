import mongoose, { type HydratedDocument, type Model } from "mongoose";

import type { Address } from "../types/domain.js";

export interface PetOwner {
  userId: mongoose.Types.ObjectId;
  phone: string;
  address: Address;
  emergencyContact: string;
  emergencyPhone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PetOwnerDocument = HydratedDocument<PetOwner>;

const addressSchema = new mongoose.Schema<Address>(
  {
    line1: { type: String, default: "" },
    line2: { type: String, default: "" }
  },
  { _id: false }
);

const petOwnerSchema = new mongoose.Schema<PetOwner>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true
    },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    address: { type: addressSchema, default: () => ({ line1: "", line2: "" }) },
    emergencyContact: { type: String, trim: true, maxlength: 120, default: "" },
    emergencyPhone: { type: String, trim: true, maxlength: 40, default: "" }
  },
  { timestamps: true }
);

petOwnerSchema.index({ phone: 1 });

const PetOwnerModel =
  (mongoose.models.pet_owner as Model<PetOwner> | undefined) ??
  mongoose.model<PetOwner>("pet_owner", petOwnerSchema);

export default PetOwnerModel;
