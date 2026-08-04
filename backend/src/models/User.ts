import mongoose, { type HydratedDocument, type Model } from "mongoose";

import {
  ACCOUNT_STATUSES,
  AUTHENTICATION_PROVIDERS,
  type AccountStatus,
  type AuthenticationProvider
} from "../constants/auth.js";
import { DEFAULT_USER_IMAGE } from "../constants/defaults.js";
import { ENTERPRISE_ROLES, type EnterpriseRole } from "../constants/rbac.js";
import type { Address, PatientHealthProfile } from "../types/domain.js";

export interface User {
  name: string;
  email: string;
  normalizedEmail: string;
  image: string;
  phone: string;
  address: Address;
  gender: string;
  dob: string;
  healthProfile: PatientHealthProfile;
  password: string;
  role: EnterpriseRole;
  organizationId?: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  accountStatus: AccountStatus;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  authenticationProvider: AuthenticationProvider;
  demoSeedKey?: string;
  demoDataLabel?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;

const addressSchema = new mongoose.Schema<Address>(
  {
    line1: { type: String, default: "" },
    line2: { type: String, default: "" }
  },
  { _id: false }
);

const healthProfileSchema = new mongoose.Schema<PatientHealthProfile>(
  {
    bloodGroup: { type: String, default: "Not known" },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    medicalNotes: { type: String, default: "" },
    emergencyContact: {
      name: { type: String, default: "" },
      relationship: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    insurance: {
      provider: { type: String, default: "" },
      policyNumber: { type: String, default: "" },
      expiryDate: { type: String, default: "" }
    },
    updatedAt: { type: Date }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    normalizedEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    image: { type: String, default: DEFAULT_USER_IMAGE },
    phone: { type: String, default: "000000000" },
    address: { type: addressSchema, default: () => ({ line1: "", line2: "" }) },
    gender: { type: String, default: "Not Selected" },
    dob: { type: String, default: "Not Selected" },
    healthProfile: { type: healthProfileSchema, default: () => ({}) },
    password: { type: String, required: true },
    role: { type: String, enum: ENTERPRISE_ROLES, default: "PATIENT", index: true },
    organizationId: { type: String, index: true },
    emailVerified: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "ACTIVE",
      index: true
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    authenticationProvider: {
      type: String,
      enum: AUTHENTICATION_PROVIDERS,
      default: "LOCAL"
    },
    demoSeedKey: { type: String, index: true },
    demoDataLabel: { type: String }
  },
  { timestamps: true }
);

userSchema.pre("validate", function normalizeUserEmail() {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
    this.normalizedEmail = this.email;
  }
});

const UserModel =
  (mongoose.models.user as Model<User> | undefined) ?? mongoose.model<User>("user", userSchema);

export default UserModel;
