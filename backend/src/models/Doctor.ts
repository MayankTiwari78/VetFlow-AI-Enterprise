import mongoose, { type HydratedDocument, type Model } from "mongoose";

import {
  ACCOUNT_STATUSES,
  AUTHENTICATION_PROVIDERS,
  type AccountStatus,
  type AuthenticationProvider
} from "../constants/auth.js";
import { ENTERPRISE_ROLES, type EnterpriseRole } from "../constants/rbac.js";
import type { Address, DoctorAvailability } from "../types/domain.js";

export interface Doctor {
  name: string;
  email: string;
  normalizedEmail: string;
  password: string;
  image: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  available: boolean;
  fees: number;
  slots_booked: Record<string, string[]>;
  availability: DoctorAvailability;
  address: Address;
  date: number;
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

export type DoctorDocument = HydratedDocument<Doctor>;

const addressSchema = new mongoose.Schema<Address>(
  {
    line1: { type: String, required: true },
    line2: { type: String, required: true }
  },
  { _id: false }
);

const defaultWeeklySchedule = () =>
  [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    slots: ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]
  }));

const availabilitySchema = new mongoose.Schema<DoctorAvailability>(
  {
    enabled: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    consultationDurationMinutes: { type: Number, default: 30, min: 15, max: 120 },
    weeklySchedule: {
      type: [
        new mongoose.Schema(
          {
            dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
            slots: { type: [String], default: [] }
          },
          { _id: false }
        )
      ],
      default: defaultWeeklySchedule
    }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema<Doctor>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    normalizedEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    slots_booked: { type: mongoose.Schema.Types.Mixed, default: {} },
    availability: { type: availabilitySchema, default: () => ({}) },
    address: { type: addressSchema, required: true },
    date: { type: Number, required: true },
    role: { type: String, enum: ENTERPRISE_ROLES, default: "DOCTOR", index: true },
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
  { minimize: false, timestamps: true }
);

doctorSchema.pre("validate", function normalizeDoctorEmail() {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
    this.normalizedEmail = this.email;
  }
});

const DoctorModel =
  (mongoose.models.doctor as Model<Doctor> | undefined) ??
  mongoose.model<Doctor>("doctor", doctorSchema);

export default DoctorModel;
