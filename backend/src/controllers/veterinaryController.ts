import type { Request } from "express";
import type { RequestHandler } from "express";

import {
  addVaccination,
  createAiReport,
  createPet,
  createPetMedicalRecord,
  createPetOwner,
  createVeterinarian,
  deleteAiReport,
  deletePet,
  deletePetMedicalRecord,
  deletePetOwnerProfile,
  deleteVaccination,
  deleteVeterinarian,
  getAiReportById,
  getOverdueVaccinations,
  getPetById,
  getPetHistory,
  getPetMedicalRecordById,
  getPetOwnerProfile,
  getUpcomingVaccinations,
  getVaccinationById,
  getVaccinationStats,
  getVeterinaryDashboardStats,
  getVeterinaryDashboardSummary,
  getVeterinarianById,
  listAiReports,
  listPets,
  listVaccinationsByPet,
  listVeterinarians,
  searchPetOwners,
  updatePet,
  updatePetMedicalRecord,
  updatePetOwnerProfile,
  updateVaccination,
  updateVeterinarian,
  type VeterinaryActor
} from "../services/veterinaryService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

const veterinaryActorFromRequest = (req: Request): VeterinaryActor => {
  if (!req.authAccountId || !req.authAccountType || !req.authRole || !req.authPermissions) {
    throw new AppError("Not Authorized Login Again", 401);
  }

  return {
    accountId: req.authAccountId,
    accountType: req.authAccountType,
    role: req.authRole,
    permissions: req.authPermissions
  };
};

const listPayload = <T>(key: string, result: { items: T[]; pagination: unknown }) => ({
  [key]: result.items,
  pagination: result.pagination
});

export const veterinaryDashboardStats: RequestHandler = asyncHandler(async (req, res) => {
  const stats = await getVeterinaryDashboardStats(veterinaryActorFromRequest(req));
  sendSuccess(res, 200, "Veterinary dashboard statistics loaded", { stats });
});

export const veterinaryDashboardSummary: RequestHandler = asyncHandler(async (req, res) => {
  const summary = await getVeterinaryDashboardSummary(veterinaryActorFromRequest(req));
  sendSuccess(res, 200, "Veterinary dashboard summary loaded", { summary });
});

export const createPetOwnerProfile: RequestHandler = asyncHandler(async (req, res) => {
  const petOwner = await createPetOwner(
    veterinaryActorFromRequest(req),
    req.body as Parameters<typeof createPetOwner>[1]
  );
  sendSuccess(res, 201, "Pet owner profile created", { petOwner });
});

export const petOwnerProfile: RequestHandler = asyncHandler(async (req, res) => {
  const petOwner = await getPetOwnerProfile(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof getPetOwnerProfile>[1]
  );
  sendSuccess(res, 200, "Pet owner profile loaded", { petOwner });
});

export const updatePetOwner: RequestHandler = asyncHandler(async (req, res) => {
  const petOwner = await updatePetOwnerProfile(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof updatePetOwnerProfile>[1],
    req.body as Parameters<typeof updatePetOwnerProfile>[2]
  );
  sendSuccess(res, 200, "Pet owner profile updated", { petOwner });
});

export const deletePetOwner: RequestHandler = asyncHandler(async (req, res) => {
  await deletePetOwnerProfile(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof deletePetOwnerProfile>[1]
  );
  sendSuccess(res, 200, "Pet owner profile deleted");
});

export const createPetProfile: RequestHandler = asyncHandler(async (req, res) => {
  const pet = await createPet(
    veterinaryActorFromRequest(req),
    req.body as Parameters<typeof createPet>[1]
  );
  sendSuccess(res, 201, "Pet created", { pet });
});

export const pets: RequestHandler = asyncHandler(async (req, res) => {
  const petList = await listPets(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof listPets>[1]
  );
  sendSuccess(res, 200, "Pets loaded", listPayload("pets", petList));
});

export const searchPets: RequestHandler = asyncHandler(async (req, res) => {
  const petList = await listPets(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof listPets>[1]
  );
  sendSuccess(res, 200, "Pet search results loaded", listPayload("pets", petList));
});

export const searchPetOwnerProfiles: RequestHandler = asyncHandler(async (req, res) => {
  const petOwners = await searchPetOwners(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof searchPetOwners>[1]
  );
  sendSuccess(res, 200, "Pet owner search results loaded", listPayload("petOwners", petOwners));
});

export const petById: RequestHandler = asyncHandler(async (req, res) => {
  const pet = await getPetById(veterinaryActorFromRequest(req), req.params.petId as string);
  sendSuccess(res, 200, "Pet loaded", { pet });
});

export const updatePetProfile: RequestHandler = asyncHandler(async (req, res) => {
  const pet = await updatePet(
    veterinaryActorFromRequest(req),
    req.params.petId as string,
    req.body as Parameters<typeof updatePet>[2]
  );
  sendSuccess(res, 200, "Pet updated", { pet });
});

export const deletePetProfile: RequestHandler = asyncHandler(async (req, res) => {
  await deletePet(veterinaryActorFromRequest(req), req.params.petId as string);
  sendSuccess(res, 200, "Pet deleted");
});

export const createVeterinarianProfile: RequestHandler = asyncHandler(async (req, res) => {
  const veterinarian = await createVeterinarian(
    veterinaryActorFromRequest(req),
    req.body as Parameters<typeof createVeterinarian>[1]
  );
  sendSuccess(res, 201, "Veterinarian profile created", { veterinarian });
});

export const veterinarians: RequestHandler = asyncHandler(async (req, res) => {
  const veterinarianList = await listVeterinarians(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof listVeterinarians>[1]
  );
  sendSuccess(res, 200, "Veterinarians loaded", listPayload("veterinarians", veterinarianList));
});

export const searchVeterinarians: RequestHandler = asyncHandler(async (req, res) => {
  const veterinarianList = await listVeterinarians(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof listVeterinarians>[1]
  );
  sendSuccess(
    res,
    200,
    "Veterinarian search results loaded",
    listPayload("veterinarians", veterinarianList)
  );
});

export const veterinarianById: RequestHandler = asyncHandler(async (req, res) => {
  const veterinarian = await getVeterinarianById(
    veterinaryActorFromRequest(req),
    req.params.veterinarianId as string
  );
  sendSuccess(res, 200, "Veterinarian loaded", { veterinarian });
});

export const updateVeterinarianProfile: RequestHandler = asyncHandler(async (req, res) => {
  const veterinarian = await updateVeterinarian(
    veterinaryActorFromRequest(req),
    req.params.veterinarianId as string,
    req.body as Parameters<typeof updateVeterinarian>[2]
  );
  sendSuccess(res, 200, "Veterinarian profile updated", { veterinarian });
});

export const deleteVeterinarianProfile: RequestHandler = asyncHandler(async (req, res) => {
  await deleteVeterinarian(veterinaryActorFromRequest(req), req.params.veterinarianId as string);
  sendSuccess(res, 200, "Veterinarian profile deleted");
});

export const createVaccination: RequestHandler = asyncHandler(async (req, res) => {
  const vaccination = await addVaccination(
    veterinaryActorFromRequest(req),
    req.body as Parameters<typeof addVaccination>[1]
  );
  sendSuccess(res, 201, "Vaccination added", { vaccination });
});

export const updateVaccinationRecord: RequestHandler = asyncHandler(async (req, res) => {
  const vaccination = await updateVaccination(
    veterinaryActorFromRequest(req),
    req.params.vaccinationId as string,
    req.body as Parameters<typeof updateVaccination>[2]
  );
  sendSuccess(res, 200, "Vaccination updated", { vaccination });
});

export const deleteVaccinationRecord: RequestHandler = asyncHandler(async (req, res) => {
  await deleteVaccination(veterinaryActorFromRequest(req), req.params.vaccinationId as string);
  sendSuccess(res, 200, "Vaccination deleted");
});

export const petVaccinations: RequestHandler = asyncHandler(async (req, res) => {
  const vaccinations = await listVaccinationsByPet(
    veterinaryActorFromRequest(req),
    req.params.petId as string,
    req.query as Parameters<typeof listVaccinationsByPet>[2]
  );
  sendSuccess(res, 200, "Vaccinations loaded", listPayload("vaccinations", vaccinations));
});

export const vaccinationStats: RequestHandler = asyncHandler(async (req, res) => {
  const stats = await getVaccinationStats(
    veterinaryActorFromRequest(req),
    req.params.petId as string
  );
  sendSuccess(res, 200, "Vaccination statistics loaded", { stats });
});

export const vaccinationById: RequestHandler = asyncHandler(async (req, res) => {
  const vaccination = await getVaccinationById(
    veterinaryActorFromRequest(req),
    req.params.vaccinationId as string
  );
  sendSuccess(res, 200, "Vaccination loaded", { vaccination });
});

export const upcomingVaccinations: RequestHandler = asyncHandler(async (req, res) => {
  const vaccinations = await getUpcomingVaccinations(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof getUpcomingVaccinations>[1]
  );
  sendSuccess(res, 200, "Upcoming vaccinations loaded", listPayload("vaccinations", vaccinations));
});

export const overdueVaccinations: RequestHandler = asyncHandler(async (req, res) => {
  const vaccinations = await getOverdueVaccinations(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof getOverdueVaccinations>[1]
  );
  sendSuccess(res, 200, "Overdue vaccinations loaded", listPayload("vaccinations", vaccinations));
});

export const createMedicalRecord: RequestHandler = asyncHandler(async (req, res) => {
  const record = await createPetMedicalRecord(
    veterinaryActorFromRequest(req),
    req.body as Parameters<typeof createPetMedicalRecord>[1]
  );
  sendSuccess(res, 201, "Pet medical record created", { record });
});

export const updateMedicalRecord: RequestHandler = asyncHandler(async (req, res) => {
  const record = await updatePetMedicalRecord(
    veterinaryActorFromRequest(req),
    req.params.recordId as string,
    req.body as Parameters<typeof updatePetMedicalRecord>[2]
  );
  sendSuccess(res, 200, "Pet medical record updated", { record });
});

export const deleteMedicalRecord: RequestHandler = asyncHandler(async (req, res) => {
  await deletePetMedicalRecord(veterinaryActorFromRequest(req), req.params.recordId as string);
  sendSuccess(res, 200, "Pet medical record deleted");
});

export const petMedicalHistory: RequestHandler = asyncHandler(async (req, res) => {
  const records = await getPetHistory(
    veterinaryActorFromRequest(req),
    req.params.petId as string,
    req.query as Parameters<typeof getPetHistory>[2]
  );
  sendSuccess(res, 200, "Pet medical history loaded", listPayload("records", records));
});

export const medicalRecordById: RequestHandler = asyncHandler(async (req, res) => {
  const record = await getPetMedicalRecordById(
    veterinaryActorFromRequest(req),
    req.params.recordId as string
  );
  sendSuccess(res, 200, "Pet medical record loaded", { record });
});

export const createPreliminaryAiReport: RequestHandler = asyncHandler(async (req, res) => {
  const report = await createAiReport(
    veterinaryActorFromRequest(req),
    req.body as Parameters<typeof createAiReport>[1]
  );
  sendSuccess(res, 201, "Preliminary assessment report created", { report });
});

export const preliminaryAiReports: RequestHandler = asyncHandler(async (req, res) => {
  const reports = await listAiReports(
    veterinaryActorFromRequest(req),
    req.query as Parameters<typeof listAiReports>[1]
  );
  sendSuccess(res, 200, "Preliminary assessment reports loaded", listPayload("reports", reports));
});

export const preliminaryAiReportById: RequestHandler = asyncHandler(async (req, res) => {
  const report = await getAiReportById(
    veterinaryActorFromRequest(req),
    req.params.reportId as string
  );
  sendSuccess(res, 200, "Preliminary assessment report loaded", { report });
});

export const deletePreliminaryAiReport: RequestHandler = asyncHandler(async (req, res) => {
  await deleteAiReport(veterinaryActorFromRequest(req), req.params.reportId as string);
  sendSuccess(res, 200, "Preliminary assessment report deleted");
});
