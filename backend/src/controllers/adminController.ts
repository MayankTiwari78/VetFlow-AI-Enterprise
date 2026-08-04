import type { RequestHandler } from "express";

import {
  cancelAdminAppointment,
  createDoctor,
  getAdminClinicalNotes,
  getAdminDashboard,
  listPatientAppointmentHistory,
  listPatients,
  listAllAppointments,
  listAllDoctors,
  updateAdminAppointmentStatus
} from "../services/adminService.js";
import { writeAuditLog } from "../services/auditService.js";
import { changeDoctorAvailability } from "../services/doctorService.js";
import {
  listAdminMedicalRecords,
  type MedicalRecordQuery
} from "../services/medicalRecordService.js";
import type { Address } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { auditContextFromRequest } from "../utils/requestAudit.js";

export const appointmentsAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const appointments = await listAllAppointments(req.authOrganizationId);
  sendSuccess(res, 200, "Appointments loaded", { appointments }, { appointments });
});

export const appointmentCancel: RequestHandler = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body as { appointmentId: string };
  await cancelAdminAppointment(appointmentId, req.authOrganizationId);
  await writeAuditLog({
    eventType: "appointment.cancelled",
    ...auditContextFromRequest(req),
    target: { type: "appointment", id: appointmentId },
    metadata: { source: "admin" }
  });
  sendSuccess(res, 200, "Appointment Cancelled");
});

export const addDoctor: RequestHandler = asyncHandler(async (req, res) => {
  const payload = req.body as {
    name: string;
    email: string;
    password: string;
    speciality: string;
    degree: string;
    experience: string;
    about: string;
    fees: number;
    address: Address;
  };

  await createDoctor(payload, req.file, req.authOrganizationId);
  sendSuccess(res, 201, "Doctor Added");
});

export const allDoctors: RequestHandler = asyncHandler(async (req, res) => {
  const doctors = await listAllDoctors(req.authOrganizationId);
  sendSuccess(res, 200, "Doctors loaded", { doctors }, { doctors });
});

export const adminDashboard: RequestHandler = asyncHandler(async (req, res) => {
  const dashData = await getAdminDashboard(req.authOrganizationId);
  sendSuccess(res, 200, "Dashboard loaded", { dashData }, { dashData });
});

export const adminChangeAvailability: RequestHandler = asyncHandler(async (req, res) => {
  const { docId } = req.body as { docId: string };
  await changeDoctorAvailability(docId, req.authOrganizationId);
  await writeAuditLog({
    eventType: "doctor.availability.updated",
    ...auditContextFromRequest(req),
    target: { type: "doctor", id: docId },
    metadata: { source: "admin_toggle" }
  });
  sendSuccess(res, 200, "Availablity Changed");
});

export const patientsAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const { search, status } = req.query as unknown as { search: string; status: string };
  const patients = await listPatients(req.authOrganizationId, search, status);
  sendSuccess(res, 200, "Patients loaded", { patients }, { patients });
});

export const patientAppointmentsAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const appointments = await listPatientAppointmentHistory(
    req.params.patientId as string,
    req.authOrganizationId
  );
  sendSuccess(res, 200, "Patient appointment history loaded", { appointments }, { appointments });
});

export const appointmentStatusAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const appointmentId = req.params.appointmentId as string;
  const { status } = req.body as { status: "completed" | "cancelled" };
  await updateAdminAppointmentStatus(appointmentId, status, req.authOrganizationId);
  await writeAuditLog({
    eventType: status === "cancelled" ? "appointment.cancelled" : "appointment.status_changed",
    ...auditContextFromRequest(req),
    target: { type: "appointment", id: appointmentId },
    metadata: { status, source: "admin" }
  });
  sendSuccess(res, 200, "Appointment status updated");
});

export const appointmentClinicalNotesAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const notes = await getAdminClinicalNotes(
    req.params.appointmentId as string,
    req.authOrganizationId
  );
  sendSuccess(res, 200, "Clinical notes loaded", { notes }, { notes });
});

export const medicalRecordsAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const records = await listAdminMedicalRecords(
    req.query as unknown as MedicalRecordQuery,
    req.authOrganizationId
  );
  sendSuccess(res, 200, "Medical records loaded", { records }, { records });
});
