import AppointmentModel, { type AppointmentDocument } from "../models/Appointment.js";
import DoctorModel from "../models/Doctor.js";
import MedicalRecordModel, {
  type MedicalRecord,
  type MedicalRecordDocument,
  type MedicalRecordType
} from "../models/MedicalRecord.js";
import UserModel from "../models/User.js";
import { hasValidCloudinaryCredentials } from "../config/cloudinary.js";
import { getAppointmentStatus, sanitizeAppointmentForPatient } from "../utils/appointments.js";
import { AppError } from "../utils/AppError.js";
import { removeSensitiveFields } from "../utils/sanitize.js";

export interface MedicalRecordPayload {
  patientId?: string;
  type: MedicalRecordType;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  patientVisible: boolean;
  status: "draft" | "finalized";
}

export interface MedicalRecordUpdatePayload {
  title?: string;
  summary?: string;
  details?: Record<string, unknown>;
  patientVisible?: boolean;
  status?: "draft" | "finalized";
}

export interface MedicalRecordQuery {
  type?: MedicalRecordType;
  status?: "draft" | "finalized";
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
}

const organizationFilter = (organizationId?: string) =>
  organizationId ? { $or: [{ organizationId }, { organizationId: { $exists: false } }] } : {};

const assertResourceOrganization = (
  resourceOrganizationId: string | undefined,
  organizationId?: string
): void => {
  if (organizationId && resourceOrganizationId && resourceOrganizationId !== organizationId) {
    throw new AppError("Resource not found", 404);
  }
};

const assertPatientExists = async (patientId: string, organizationId?: string): Promise<void> => {
  const patient = await UserModel.findById(patientId);
  if (!patient) {
    throw new AppError("Patient not found", 404);
  }
  assertResourceOrganization(patient.organizationId, organizationId);
};

const getDoctorDisplayName = async (doctorId: string): Promise<string> => {
  const doctor = await DoctorModel.findById(doctorId);
  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }
  return doctor.name;
};

const getAuthorizedDoctorAppointment = async (
  doctorId: string,
  appointmentId: string,
  organizationId?: string
): Promise<AppointmentDocument> => {
  const appointment = await AppointmentModel.findById(appointmentId);
  if (!appointment || appointment.docId !== doctorId) {
    throw new AppError("Appointment not found", 404);
  }
  assertResourceOrganization(appointment.organizationId, organizationId);
  if (getAppointmentStatus(appointment) !== "completed") {
    throw new AppError("Create patient-visible records only after completing the appointment", 409);
  }
  return appointment;
};

const assertDoctorCanAccessPatient = async (
  doctorId: string,
  patientId: string,
  organizationId?: string
): Promise<void> => {
  const appointment = await AppointmentModel.findOne({
    docId: doctorId,
    userId: patientId,
    ...organizationFilter(organizationId)
  });

  if (!appointment) {
    throw new AppError("Patient not found", 404);
  }
};

const sanitizeRecord = (record: MedicalRecordDocument | MedicalRecord): Record<string, unknown> =>
  removeSensitiveFields(record) as unknown as Record<string, unknown>;

const normalizeReportDetails = (
  type: MedicalRecordType,
  details: Record<string, unknown>
): Record<string, unknown> => {
  if (type !== "report_metadata") {
    return details;
  }

  const report =
    details.report && typeof details.report === "object"
      ? (details.report as Record<string, unknown>)
      : {};

  return {
    ...details,
    report: {
      ...report,
      storageStatus: hasValidCloudinaryCredentials() ? "metadata_only" : "storage_not_configured",
      publicUrl: undefined
    }
  };
};

export const createDoctorMedicalRecord = async ({
  doctorId,
  appointmentId,
  payload,
  organizationId
}: {
  doctorId: string;
  appointmentId: string;
  payload: MedicalRecordPayload;
  organizationId?: string;
}): Promise<Record<string, unknown>> => {
  const appointment = await getAuthorizedDoctorAppointment(doctorId, appointmentId, organizationId);
  if (payload.patientId && payload.patientId !== appointment.userId) {
    throw new AppError("Appointment patient mismatch", 400);
  }

  const created = await new MedicalRecordModel({
    patientId: appointment.userId,
    appointmentId,
    organizationId: appointment.organizationId ?? organizationId,
    type: payload.type,
    title: payload.title,
    summary: payload.summary,
    details: normalizeReportDetails(payload.type, payload.details),
    status: payload.status,
    patientVisible: payload.patientVisible,
    author: {
      accountType: "doctor",
      accountId: doctorId,
      displayName: await getDoctorDisplayName(doctorId)
    },
    finalizedAt: payload.status === "finalized" ? new Date() : undefined
  }).save();

  return sanitizeRecord(created);
};

export const listDoctorPatientRecords = async (
  doctorId: string,
  patientId: string,
  organizationId?: string
): Promise<Record<string, unknown>[]> => {
  await assertDoctorCanAccessPatient(doctorId, patientId, organizationId);
  const records = await MedicalRecordModel.find({
    patientId,
    ...organizationFilter(organizationId)
  }).sort({ createdAt: -1 });
  return records.map(sanitizeRecord);
};

export const updateDoctorMedicalRecord = async ({
  doctorId,
  recordId,
  payload,
  organizationId
}: {
  doctorId: string;
  recordId: string;
  payload: MedicalRecordUpdatePayload;
  organizationId?: string;
}): Promise<Record<string, unknown>> => {
  const record = await MedicalRecordModel.findById(recordId);
  if (!record || record.author.accountType !== "doctor" || record.author.accountId !== doctorId) {
    throw new AppError("Medical record not found", 404);
  }
  assertResourceOrganization(record.organizationId, organizationId);

  if (record.status === "finalized") {
    throw new AppError("Finalized records cannot be edited; create an addendum record", 409);
  }

  if (payload.title !== undefined) record.title = payload.title;
  if (payload.summary !== undefined) record.summary = payload.summary;
  if (payload.details !== undefined) record.details = normalizeReportDetails(record.type, payload.details);
  if (payload.patientVisible !== undefined) record.patientVisible = payload.patientVisible;
  if (payload.status === "finalized") {
    record.status = "finalized";
    record.finalizedAt = new Date();
  }

  await record.save();
  return sanitizeRecord(record);
};

export const finalizeDoctorMedicalRecord = async (
  doctorId: string,
  recordId: string,
  organizationId?: string
): Promise<Record<string, unknown>> => updateDoctorMedicalRecord({
  doctorId,
  recordId,
  payload: { status: "finalized" },
  organizationId
});

export const listPatientVisibleRecords = async (
  patientId: string,
  organizationId?: string
): Promise<Record<string, unknown>[]> => {
  const records = await MedicalRecordModel.find({
    patientId,
    status: "finalized",
    patientVisible: true,
    ...organizationFilter(organizationId)
  }).sort({ finalizedAt: -1, createdAt: -1 });

  return records.map(sanitizeRecord);
};

export const getPatientTimeline = async (
  patientId: string,
  organizationId?: string
): Promise<Record<string, unknown>> => {
  const patient = await UserModel.findById(patientId).select("-password");
  if (!patient) {
    throw new AppError("Patient not found", 404);
  }
  assertResourceOrganization(patient.organizationId, organizationId);

  const [appointments, records] = await Promise.all([
    AppointmentModel.find({ userId: patientId, ...organizationFilter(organizationId) }).sort({
      date: -1
    }),
    listPatientVisibleRecords(patientId, organizationId)
  ]);

  return {
    patient: removeSensitiveFields(patient),
    appointments: appointments.map(sanitizeAppointmentForPatient),
    records,
    healthProfile: patient.healthProfile,
    documentStorage: {
      configured: hasValidCloudinaryCredentials(),
      message: hasValidCloudinaryCredentials()
        ? "Report metadata can be linked by authorized care teams."
        : "Storage is not configured in this local environment. Report uploads are disabled."
    }
  };
};

export const listAdminMedicalRecords = async (
  query: MedicalRecordQuery,
  organizationId?: string
): Promise<Record<string, unknown>[]> => {
  const filter: Record<string, unknown> = { ...organizationFilter(organizationId) };

  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.patientId) {
    await assertPatientExists(query.patientId, organizationId);
    filter.patientId = query.patientId;
  }
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(`${query.dateFrom}T00:00:00`) } : {}),
      ...(query.dateTo ? { $lte: new Date(`${query.dateTo}T23:59:59`) } : {})
    };
  }

  const records = await MedicalRecordModel.find(filter).sort({ createdAt: -1 }).limit(query.limit);
  return records.map(sanitizeRecord);
};
