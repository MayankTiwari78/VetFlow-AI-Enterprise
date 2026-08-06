import { Router } from "express";

import {
  createMedicalRecord,
  createPetOwnerProfile,
  createPetProfile,
  createPreliminaryAiReport,
  createVaccination,
  createVeterinarianProfile,
  deleteMedicalRecord,
  deletePetOwner,
  deletePetProfile,
  deletePreliminaryAiReport,
  deleteVaccinationRecord,
  deleteVeterinarianProfile,
  medicalRecordById,
  petById,
  petMedicalHistory,
  petOwnerProfile,
  pets,
  petVaccinations,
  preliminaryAiReportById,
  preliminaryAiReports,
  searchPetOwnerProfiles,
  searchPets,
  searchVeterinarians,
  updateMedicalRecord,
  updatePetOwner,
  updatePetProfile,
  updateVaccinationRecord,
  updateVeterinarianProfile,
  veterinaryDashboardStats,
  veterinaryDashboardSummary,
  veterinarianById,
  veterinarians
} from "../controllers/veterinaryController.js";
import { authAny, authorizePermissions } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  aiReportCreateSchema,
  aiReportIdParamSchema,
  aiReportQuerySchema,
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
veterinaryRouter.delete(
  "/ai-reports/:reportId",
  authAny,
  authorizePermissions("users:manage"),
  validateRequest({ params: aiReportIdParamSchema }),
  deletePreliminaryAiReport
);

export default veterinaryRouter;
