import { Router } from "express";

import { loginAdmin } from "../controllers/authController.js";
import {
  addDoctor,
  adminChangeAvailability,
  adminDashboard,
  allDoctors,
  appointmentClinicalNotesAdmin,
  appointmentCancel,
  appointmentStatusAdmin,
  appointmentsAdmin,
  medicalRecordsAdmin,
  patientAppointmentsAdmin,
  patientsAdmin
} from "../controllers/adminController.js";
import { authAdmin, authorizePermissions } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/security.js";
import upload from "../middleware/upload.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { adminLoginSchema } from "../validators/authValidators.js";
import {
  addDoctorSchema,
  adminAppointmentParamsSchema,
  adminAppointmentStatusSchema,
  adminCancelAppointmentSchema,
  changeAvailabilitySchema,
  patientDirectoryQuerySchema,
  patientParamsSchema
} from "../validators/adminValidators.js";
import { medicalRecordQuerySchema } from "../validators/medicalRecordValidators.js";

const adminRouter = Router();

adminRouter.post(
  "/login",
  authRateLimiter,
  validateRequest({ body: adminLoginSchema }),
  loginAdmin
);
adminRouter.post(
  "/add-doctor",
  authAdmin,
  authorizePermissions("doctors:manage"),
  upload.single("image"),
  validateRequest({ body: addDoctorSchema }),
  addDoctor
);
adminRouter.get(
  "/appointments",
  authAdmin,
  authorizePermissions("appointments:read"),
  appointmentsAdmin
);
adminRouter.post(
  "/cancel-appointment",
  authAdmin,
  authorizePermissions("appointments:cancel"),
  validateRequest({ body: adminCancelAppointmentSchema }),
  appointmentCancel
);
adminRouter.get("/all-doctors", authAdmin, authorizePermissions("doctors:read"), allDoctors);
adminRouter.get(
  "/patients",
  authAdmin,
  authorizePermissions("users:read"),
  validateRequest({ query: patientDirectoryQuerySchema }),
  patientsAdmin
);
adminRouter.get(
  "/patients/:patientId/appointments",
  authAdmin,
  authorizePermissions("users:read", "appointments:read"),
  validateRequest({ params: patientParamsSchema }),
  patientAppointmentsAdmin
);
adminRouter.get(
  "/medical-records",
  authAdmin,
  authorizePermissions("users:read", "appointments:read"),
  validateRequest({ query: medicalRecordQuerySchema }),
  medicalRecordsAdmin
);
adminRouter.patch(
  "/appointments/:appointmentId/status",
  authAdmin,
  authorizePermissions("appointments:update"),
  validateRequest({ params: adminAppointmentParamsSchema, body: adminAppointmentStatusSchema }),
  appointmentStatusAdmin
);
adminRouter.get(
  "/appointments/:appointmentId/clinical-notes",
  authAdmin,
  authorizePermissions("appointments:update"),
  validateRequest({ params: adminAppointmentParamsSchema }),
  appointmentClinicalNotesAdmin
);
adminRouter.post(
  "/change-availability",
  authAdmin,
  authorizePermissions("doctors:manage"),
  validateRequest({ body: changeAvailabilitySchema }),
  adminChangeAvailability
);
adminRouter.get(
  "/dashboard",
  authAdmin,
  authorizePermissions("appointments:read", "doctors:read", "users:read"),
  adminDashboard
);

export default adminRouter;
