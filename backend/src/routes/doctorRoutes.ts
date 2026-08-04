import { Router } from "express";

import { loginDoctor } from "../controllers/authController.js";
import {
  appointmentCancel,
  appointmentComplete,
  appointmentsDoctor,
  availableSlots,
  changeAvailablity,
  createAppointmentMedicalRecord,
  doctorDashboard,
  doctorList,
  doctorPatientMedicalRecords,
  doctorProfile,
  finalizeAppointmentMedicalRecord,
  ownAvailability,
  updateClinicalNotes,
  updateAppointmentMedicalRecord,
  updateOwnAvailability,
  updateDoctorProfile
} from "../controllers/doctorController.js";
import { authDoctor, authorizePermissions } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/security.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginSchema } from "../validators/authValidators.js";
import {
  availableSlotsParamsSchema,
  availableSlotsQuerySchema,
  clinicalNotesParamsSchema,
  doctorActionAppointmentSchema,
  updateClinicalNotesSchema,
  updateDoctorAvailabilitySchema,
  updateDoctorProfileSchema
} from "../validators/doctorValidators.js";
import {
  appointmentMedicalRecordParamsSchema,
  medicalRecordCreateSchema,
  medicalRecordParamsSchema,
  medicalRecordUpdateSchema,
  patientMedicalRecordParamsSchema
} from "../validators/medicalRecordValidators.js";

const doctorRouter = Router();

doctorRouter.post("/login", authRateLimiter, validateRequest({ body: loginSchema }), loginDoctor);
doctorRouter.get(
  "/:doctorId/available-slots",
  validateRequest({ params: availableSlotsParamsSchema, query: availableSlotsQuerySchema }),
  availableSlots
);
doctorRouter.post(
  "/cancel-appointment",
  authDoctor,
  authorizePermissions("appointments:cancel"),
  validateRequest({ body: doctorActionAppointmentSchema }),
  appointmentCancel
);
doctorRouter.get(
  "/appointments",
  authDoctor,
  authorizePermissions("appointments:read"),
  appointmentsDoctor
);
doctorRouter.get("/list", doctorList);
doctorRouter.get(
  "/availability",
  authDoctor,
  authorizePermissions("doctors:read"),
  ownAvailability
);
doctorRouter.put(
  "/availability",
  authDoctor,
  authorizePermissions("doctors:manage"),
  validateRequest({ body: updateDoctorAvailabilitySchema }),
  updateOwnAvailability
);
doctorRouter.patch(
  "/appointments/:appointmentId/clinical-notes",
  authDoctor,
  authorizePermissions("appointments:update"),
  validateRequest({ params: clinicalNotesParamsSchema, body: updateClinicalNotesSchema }),
  updateClinicalNotes
);
doctorRouter.post(
  "/appointments/:appointmentId/medical-records",
  authDoctor,
  authorizePermissions("appointments:update"),
  validateRequest({
    params: appointmentMedicalRecordParamsSchema,
    body: medicalRecordCreateSchema
  }),
  createAppointmentMedicalRecord
);
doctorRouter.get(
  "/patients/:patientId/medical-records",
  authDoctor,
  authorizePermissions("appointments:read"),
  validateRequest({ params: patientMedicalRecordParamsSchema }),
  doctorPatientMedicalRecords
);
doctorRouter.patch(
  "/medical-records/:recordId",
  authDoctor,
  authorizePermissions("appointments:update"),
  validateRequest({ params: medicalRecordParamsSchema, body: medicalRecordUpdateSchema }),
  updateAppointmentMedicalRecord
);
doctorRouter.post(
  "/medical-records/:recordId/finalize",
  authDoctor,
  authorizePermissions("appointments:update"),
  validateRequest({ params: medicalRecordParamsSchema }),
  finalizeAppointmentMedicalRecord
);
doctorRouter.post(
  "/change-availability",
  authDoctor,
  authorizePermissions("doctors:manage"),
  changeAvailablity
);
doctorRouter.post(
  "/complete-appointment",
  authDoctor,
  authorizePermissions("appointments:update"),
  validateRequest({ body: doctorActionAppointmentSchema }),
  appointmentComplete
);
doctorRouter.get(
  "/dashboard",
  authDoctor,
  authorizePermissions("appointments:read"),
  doctorDashboard
);
doctorRouter.get("/profile", authDoctor, authorizePermissions("doctors:read"), doctorProfile);
doctorRouter.post(
  "/update-profile",
  authDoctor,
  authorizePermissions("doctors:manage"),
  validateRequest({ body: updateDoctorProfileSchema }),
  updateDoctorProfile
);

export default doctorRouter;
