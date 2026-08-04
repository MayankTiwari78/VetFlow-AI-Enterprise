import crypto from "node:crypto";

import QRCode from "qrcode";

import { env } from "../config/env.js";
import UserModel from "../models/User.js";
import { AppError } from "../utils/AppError.js";

const signOpaque = (value: string): string =>
  crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(value).digest("base64url");

const cardIdentity = (patientId: string, organizationId?: string) => {
  const tenant = organizationId ?? "default";
  const lookupId = signOpaque(`health-card-lookup:${tenant}:${patientId}`).slice(0, 48);
  const cardId = `MF-${signOpaque(`health-card-id:${tenant}:${patientId}`).slice(0, 12).toUpperCase()}`;
  return { cardId, lookupId };
};

export const getPatientHealthCard = async (
  patientId: string,
  organizationId?: string
): Promise<Record<string, unknown>> => {
  const patient = await UserModel.findById(patientId).select("-password");
  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  if (organizationId && patient.organizationId && patient.organizationId !== organizationId) {
    throw new AppError("Resource not found", 404);
  }

  const { cardId, lookupId } = cardIdentity(patientId, patient.organizationId ?? organizationId);
  const qrPayload = JSON.stringify({
    type: "medflow-health-card",
    version: 1,
    lookupId
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: "M", margin: 1 });

  return {
    cardId,
    lookupId,
    qrPayload,
    qrDataUrl,
    patient: {
      name: patient.name,
      image: patient.image,
      bloodGroup: patient.healthProfile?.bloodGroup ?? "Not known",
      emergencyContact: patient.healthProfile?.emergencyContact ?? {
        name: "",
        relationship: "",
        phone: ""
      }
    }
  };
};

export const lookupHealthCardStatus = async (
  lookupId: string,
  organizationId?: string
): Promise<Record<string, unknown>> => {
  const patients = await UserModel.find(
    organizationId
      ? { $or: [{ organizationId }, { organizationId: { $exists: false } }] }
      : {}
  ).select("_id organizationId");

  const match = patients.find(
    (patient) => cardIdentity(String(patient._id), patient.organizationId ?? organizationId).lookupId === lookupId
  );

  if (!match) {
    throw new AppError("Health card not found", 404);
  }

  const { cardId } = cardIdentity(String(match._id), match.organizationId ?? organizationId);
  return {
    valid: true,
    cardId,
    status: "active",
    message: "MedFlow health card exists. Sign in with an authorized account to view any health details."
  };
};
