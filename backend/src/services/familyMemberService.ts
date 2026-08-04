import FamilyMemberModel from "../models/FamilyMember.js";
import type { FamilyMemberDocument } from "../models/FamilyMember.js";
import UserModel from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { removeSensitiveFields } from "../utils/sanitize.js";

export interface FamilyMemberPayload {
  name: string;
  relationship: string;
  dob: string;
  phone?: string;
  email?: string;
  emergencyContact: boolean;
}

const sanitizeFamilyMember = (familyMember: FamilyMemberDocument): Record<string, unknown> =>
  removeSensitiveFields(familyMember) as unknown as Record<string, unknown>;

const organizationFilter = (organizationId?: string) =>
  organizationId ? { $or: [{ organizationId }, { organizationId: { $exists: false } }] } : {};

const assertPatientOrganization = async (
  patientId: string,
  organizationId?: string
): Promise<void> => {
  const patient = await UserModel.findById(patientId);
  if (!patient) {
    throw new AppError("Patient not found", 404);
  }
  if (organizationId && patient.organizationId && patient.organizationId !== organizationId) {
    throw new AppError("Resource not found", 404);
  }
};

export const listFamilyMembers = async (
  patientId: string,
  organizationId?: string
): Promise<Record<string, unknown>[]> => {
  await assertPatientOrganization(patientId, organizationId);
  const familyMembers = await FamilyMemberModel.find({
    ownerPatientId: patientId,
    ...organizationFilter(organizationId)
  }).sort({ createdAt: -1 });
  return familyMembers.map(sanitizeFamilyMember);
};

export const createFamilyMember = async (
  patientId: string,
  payload: FamilyMemberPayload,
  organizationId?: string
): Promise<Record<string, unknown>> => {
  await assertPatientOrganization(patientId, organizationId);
  const created = await new FamilyMemberModel({
    ownerPatientId: patientId,
    organizationId,
    ...payload,
    linkedAccountId: undefined,
    consentScope: "Non-linked dependent/contact profile only. No medical-record access is granted."
  }).save();

  return sanitizeFamilyMember(created);
};

export const removeFamilyMember = async (
  patientId: string,
  familyMemberId: string,
  organizationId?: string
): Promise<void> => {
  const familyMember = await FamilyMemberModel.findOne({
    _id: familyMemberId,
    ownerPatientId: patientId,
    ...organizationFilter(organizationId)
  });

  if (!familyMember) {
    throw new AppError("Family member not found", 404);
  }

  await FamilyMemberModel.deleteOne({ _id: familyMember._id });
};
