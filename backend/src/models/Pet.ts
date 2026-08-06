import mongoose, { type HydratedDocument, type Model } from "mongoose";

export interface Pet {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  species: string;
  breed: string;
  gender: string;
  age?: number;
  weight?: number;
  color: string;
  dateOfBirth?: Date;
  microchipNumber?: string;
  vaccinationStatus: string;
  allergies: string[];
  medicalHistory: string[];
  profileImage: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PetDocument = HydratedDocument<Pet>;

const petSchema = new mongoose.Schema<Pet>(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "pet_owner",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    species: { type: String, required: true, trim: true, maxlength: 80, index: true },
    breed: { type: String, trim: true, maxlength: 120, default: "" },
    gender: { type: String, trim: true, maxlength: 40, default: "Not Selected" },
    age: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },
    color: { type: String, trim: true, maxlength: 80, default: "" },
    dateOfBirth: { type: Date },
    microchipNumber: { type: String, trim: true, maxlength: 80, index: true, sparse: true },
    vaccinationStatus: { type: String, trim: true, maxlength: 80, default: "unknown", index: true },
    allergies: { type: [String], default: [] },
    medicalHistory: { type: [String], default: [] },
    profileImage: { type: String, default: "" }
  },
  { timestamps: true }
);

petSchema.index({ ownerId: 1, name: 1 });
petSchema.index(
  { microchipNumber: 1 },
  { unique: true, sparse: true, partialFilterExpression: { microchipNumber: { $type: "string" } } }
);

const PetModel =
  (mongoose.models.pet as Model<Pet> | undefined) ?? mongoose.model<Pet>("pet", petSchema);

export default PetModel;
