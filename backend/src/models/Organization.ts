import mongoose, { type HydratedDocument, type Model } from "mongoose";

import { ORGANIZATION_STATUSES, type OrganizationStatus } from "../constants/rbac.js";

export interface Organization {
  name: string;
  slug: string;
  status: OrganizationStatus;
  contactEmail?: string;
  contactPhone?: string;
  settings: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationDocument = HydratedDocument<Organization>;

const organizationSchema = new mongoose.Schema<Organization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    status: { type: String, enum: ORGANIZATION_STATUSES, default: "ACTIVE", index: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

const OrganizationModel =
  (mongoose.models.organization as Model<Organization> | undefined) ??
  mongoose.model<Organization>("organization", organizationSchema);

export default OrganizationModel;
