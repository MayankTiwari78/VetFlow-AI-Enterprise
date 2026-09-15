import { Router } from "express";

import {
  createMedicalRecord,
  createPetOwnerProfile,
  createPetProfile,
  createPreliminaryAiReport,
  createPrescription,
  createVaccination,
  createVeterinarianProfile,
  consultationRequestsList,
  deleteMedicalRecord,
  deletePetOwner,
  deletePetProfile,
  deletePetPhoto,
  deletePreliminaryAiReport,
  deleteVaccinationRecord,
  deleteVeterinarianProfile,
  medicalRecordById,
  nearbyVeterinarianList,
  newConsultationRequest,
  overdueVaccinations,
  petById,
  petMedicalHistory,
  petOwnerProfile,
  pets,
  petVaccinations,
  preliminaryAiReportById,
  preliminaryAiReports,
  prescriptionById,
  prescriptionsList,
  searchPetOwnerProfiles,
  searchPets,
  searchVeterinarians,
  upcomingVaccinations,
  updateConsultationStatus,
  updateMedicalRecord,
  updatePetOwner,
  updatePetProfile,
  updatePetPhoto,
  updatePreliminaryAiReportReview,
  updateVaccinationRecord,
  updateVeterinarianProfile,
  vaccinationById,
  vaccinationStats,
  veterinaryDashboardStats,
  veterinaryDashboardSummary,
  veterinaryReviewDetail,
  veterinaryReviewQueue,
  veterinarianById,
  veterinarians
} from "../controllers/veterinaryController.js";
import { authAny, authorizePermissions } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  aiReportCreateSchema,
  aiReportIdParamSchema,
  aiReportQuerySchema,
  aiReportReviewUpdateSchema,
  consultationIdParamSchema,
  consultationRequestCreateSchema,
  consultationRequestQuerySchema,
  consultationRequestUpdateSchema,
  nearbyVeterinarianQuerySchema,
  ownerIdQuerySchema,
  petCreateSchema,
  petIdParamSchema,
  petMedicalRecordCreateSchema,
  petMedicalRecordIdParamSchema,
  petMedicalRecordQuerySchema,
  petMedicalRecordUpdateSchema,
  petOwnerSearchQuerySchema,
  petOwnerCreateSchema,
  petOwnerUpdateSchema,
  petUpdateSchema,
  prescriptionCreateSchema,
  prescriptionIdParamSchema,
  prescriptionQuerySchema,
  reviewQueueQuerySchema,
  vaccinationCreateSchema,
  vaccinationIdParamSchema,
  vaccinationQuerySchema,
  vaccinationUpdateSchema,
  veterinarianCreateSchema,
  veterinarianIdParamSchema,
  veterinarianUpdateSchema,
  veterinaryListQuerySchema,
  veterinaryTargetQuerySchema
} from "../validators/veterinaryValidators.js";

const veterinaryRouter = Router();

veterinaryRouter.get("/dashboard/stats", authAny, veterinaryDashboardStats);
veterinaryRouter.get("/dashboard/summary", authAny, veterinaryDashboardSummary);

veterinaryRouter.get(
  "/search/pets",
  authAny,
  validateRequest({ query: ownerIdQuerySchema }),
  searchPets
);
veterinaryRouter.get(
  "/search/pet-owners",
  authAny,
  validateRequest({ query: petOwnerSearchQuerySchema }),
  searchPetOwnerProfiles
);
veterinaryRouter.get(
  "/search/veterinarians",
  authAny,
  validateRequest({ query: veterinaryListQuerySchema }),
  searchVeterinarians
);

veterinaryRouter.post(
  "/pet-owners",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ body: petOwnerCreateSchema }),
  createPetOwnerProfile
);
veterinaryRouter.get(
  "/pet-owners/profile",
  authAny,
  authorizePermissions("users:read"),
  validateRequest({ query: veterinaryTargetQuerySchema }),
  petOwnerProfile
);
veterinaryRouter.put(
  "/pet-owners/profile",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ query: veterinaryTargetQuerySchema, body: petOwnerUpdateSchema }),
  updatePetOwner
);
veterinaryRouter.delete(
  "/pet-owners/profile",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ query: veterinaryTargetQuerySchema }),
  deletePetOwner
);

veterinaryRouter.post(
  "/pets",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ body: petCreateSchema }),
  createPetProfile
);
veterinaryRouter.get("/pets", authAny, validateRequest({ query: ownerIdQuerySchema }), pets);
veterinaryRouter.get(
  "/pets/:petId",
  authAny,
  validateRequest({ params: petIdParamSchema }),
  petById
);
veterinaryRouter.put(
  "/pets/:petId",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ params: petIdParamSchema, body: petUpdateSchema }),
  updatePetProfile
);
veterinaryRouter.delete(
  "/pets/:petId",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ params: petIdParamSchema }),
  deletePetProfile
);

// Pet photo upload/removal (multipart/form-data; field name: "image").
// Reuses the shared image upload middleware and Cloudinary/dev-fallback pipeline.
veterinaryRouter.post(
  "/pets/:petId/photo",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ params: petIdParamSchema }),
  upload.single("image"),
  updatePetPhoto
);
veterinaryRouter.delete(
  "/pets/:petId/photo",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ params: petIdParamSchema }),
  deletePetPhoto
);

veterinaryRouter.post(
  "/veterinarians",
  authAny,
  authorizePermissions("doctors:manage"),
  validateRequest({ body: veterinarianCreateSchema }),
  createVeterinarianProfile
);
veterinaryRouter.get(
  "/veterinarians",
  authAny,
  validateRequest({ query: veterinaryListQuerySchema }),
  veterinarians
);
veterinaryRouter.get(
  "/veterinarians/:veterinarianId",
  authAny,
  validateRequest({ params: veterinarianIdParamSchema }),
  veterinarianById
);
veterinaryRouter.put(
  "/veterinarians/:veterinarianId",
  authAny,
  authorizePermissions("doctors:manage"),
  validateRequest({ params: veterinarianIdParamSchema, body: veterinarianUpdateSchema }),
  updateVeterinarianProfile
);
veterinaryRouter.delete(
  "/veterinarians/:veterinarianId",
  authAny,
  authorizePermissions("doctors:manage"),
  validateRequest({ params: veterinarianIdParamSchema }),
  deleteVeterinarianProfile
);

veterinaryRouter.post(
  "/vaccinations",
  authAny,
  validateRequest({ body: vaccinationCreateSchema }),
  createVaccination
);
veterinaryRouter.get(
  "/vaccinations/upcoming",
  authAny,
  validateRequest({ query: vaccinationQuerySchema }),
  upcomingVaccinations
);
veterinaryRouter.get(
  "/vaccinations/overdue",
  authAny,
  validateRequest({ query: vaccinationQuerySchema }),
  overdueVaccinations
);
veterinaryRouter.get(
  "/vaccinations/:vaccinationId",
  authAny,
  validateRequest({ params: vaccinationIdParamSchema }),
  vaccinationById
);
veterinaryRouter.patch(
  "/vaccinations/:vaccinationId",
  authAny,
  validateRequest({ params: vaccinationIdParamSchema, body: vaccinationUpdateSchema }),
  updateVaccinationRecord
);
veterinaryRouter.delete(
  "/vaccinations/:vaccinationId",
  authAny,
  validateRequest({ params: vaccinationIdParamSchema }),
  deleteVaccinationRecord
);
veterinaryRouter.get(
  "/pets/:petId/vaccinations",
  authAny,
  validateRequest({ params: petIdParamSchema, query: vaccinationQuerySchema }),
  petVaccinations
);
veterinaryRouter.get(
  "/pets/:petId/vaccinations/stats",
  authAny,
  validateRequest({ params: petIdParamSchema }),
  vaccinationStats
);

veterinaryRouter.post(
  "/pet-medical-records",
  authAny,
  authorizePermissions("appointments:update"),
  validateRequest({ body: petMedicalRecordCreateSchema }),
  createMedicalRecord
);
veterinaryRouter.get(
  "/pets/:petId/medical-records",
  authAny,
  validateRequest({ params: petIdParamSchema, query: petMedicalRecordQuerySchema }),
  petMedicalHistory
);
veterinaryRouter.get(
  "/pet-medical-records/:recordId",
  authAny,
  validateRequest({ params: petMedicalRecordIdParamSchema }),
  medicalRecordById
);
veterinaryRouter.patch(
  "/pet-medical-records/:recordId",
  authAny,
  authorizePermissions("appointments:update"),
  validateRequest({
    params: petMedicalRecordIdParamSchema,
    body: petMedicalRecordUpdateSchema
  }),
  updateMedicalRecord
);
veterinaryRouter.delete(
  "/pet-medical-records/:recordId",
  authAny,
  authorizePermissions("appointments:update"),
  validateRequest({ params: petMedicalRecordIdParamSchema }),
  deleteMedicalRecord
);

veterinaryRouter.post(
  "/ai-reports",
  authAny,
  validateRequest({ body: aiReportCreateSchema }),
  createPreliminaryAiReport
);
veterinaryRouter.get(
  "/ai-reports",
  authAny,
  validateRequest({ query: aiReportQuerySchema }),
  preliminaryAiReports
);
veterinaryRouter.get(
  "/ai-reports/:reportId",
  authAny,
  validateRequest({ params: aiReportIdParamSchema }),
  preliminaryAiReportById
);
veterinaryRouter.patch(
  "/ai-reports/:reportId/review",
  authAny,
  authorizePermissions("appointments:update"),
  validateRequest({ params: aiReportIdParamSchema, body: aiReportReviewUpdateSchema }),
  updatePreliminaryAiReportReview
);
veterinaryRouter.delete(
  "/ai-reports/:reportId",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ params: aiReportIdParamSchema }),
  deletePreliminaryAiReport
);

// ======== Stage 4 — Veterinarian Review & Clinical Decision Workflow ========

// Veterinarian review queue (combined AI reports primary).
veterinaryRouter.get(
  "/review-queue",
  authAny,
  authorizePermissions("reports:read"),
  validateRequest({ query: reviewQueueQuerySchema }),
  veterinaryReviewQueue
);

// Unified clinical review workspace for one report.
veterinaryRouter.get(
  "/ai-reports/:reportId/review-detail",
  authAny,
  authorizePermissions("reports:read"),
  validateRequest({ params: aiReportIdParamSchema }),
  veterinaryReviewDetail
);

// Prescriptions (only after veterinarian approval/modification).
veterinaryRouter.post(
  "/ai-reports/:reportId/prescriptions",
  authAny,
  authorizePermissions("appointments:update"),
  validateRequest({ params: aiReportIdParamSchema, body: prescriptionCreateSchema }),
  createPrescription
);
veterinaryRouter.get(
  "/prescriptions",
  authAny,
  validateRequest({ query: prescriptionQuerySchema }),
  prescriptionsList
);
veterinaryRouter.get(
  "/prescriptions/:prescriptionId",
  authAny,
  validateRequest({ params: prescriptionIdParamSchema }),
  prescriptionById
);

// Online consultation request foundation.
veterinaryRouter.post(
  "/consultation-requests",
  authAny,
  validateRequest({ body: consultationRequestCreateSchema }),
  newConsultationRequest
);
veterinaryRouter.get(
  "/consultation-requests",
  authAny,
  validateRequest({ query: consultationRequestQuerySchema }),
  consultationRequestsList
);
veterinaryRouter.patch(
  "/consultation-requests/:consultationId/status",
  authAny,
  authorizePermissions("appointments:update"),
  validateRequest({ params: consultationIdParamSchema, body: consultationRequestUpdateSchema }),
  updateConsultationStatus
);

// Nearby veterinarian discovery boundary (location permission on the client).
veterinaryRouter.get(
  "/veterinarians/nearby",
  authAny,
  authorizePermissions("doctors:read"),
  validateRequest({ query: nearbyVeterinarianQuerySchema }),
  nearbyVeterinarianList
);

export default veterinaryRouter;
