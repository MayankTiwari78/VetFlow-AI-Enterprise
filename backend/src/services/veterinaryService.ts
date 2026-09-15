import type { AccountType } from "../constants/auth.js";
import type { AuditEventType } from "../constants/audit.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";
import type {
  AiReportReviewStatus,
  AiReviewDecision
} from "../models/AIReport.js";
import AIReportModel, {
  AI_REPORT_REVIEW_STATUSES,
  AI_REVIEW_DECISIONS
} from "../models/AIReport.js";
import ConsultationRequestModel from "../models/ConsultationRequest.js";
import DoctorModel from "../models/Doctor.js";
import PetModel from "../models/Pet.js";
import PetMedicalRecordModel from "../models/PetMedicalRecord.js";
import PetOwnerModel from "../models/PetOwner.js";
import UserModel from "../models/User.js";
import VaccinationModel from "../models/Vaccination.js";
import VeterinarianModel from "../models/Veterinarian.js";
import VeterinaryPrescriptionModel from "../models/VeterinaryPrescription.js";
import { AppError } from "../utils/AppError.js";
import { writeAuditLog } from "./auditService.js";
import { uploadImageToCloudinary } from "./uploadService.js";
import { DEFAULT_PET_IMAGE } from "../constants/defaults.js";

export interface VeterinaryActor {
  accountId: string;
  accountType: AccountType;
  role: EnterpriseRole;
  permissions: Permission[];
}

type PetOwnerPayload = {
  userId?: string;
  phone: string;
  address: { line1: string; line2: string };
  emergencyContact: string;
  emergencyPhone: string;
};

type PetPayload = {
  ownerId?: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  age?: number;
  weight?: number;
  color: string;
  dateOfBirth?: Date;
  microchipNumber?: string;
  vaccinationStatus: string;
  allergies: string[];
  medicalHistory: string[];
  profileImage: string;
};

type VeterinarianPayload = {
  doctorId: string;
  specialization: string[];
  clinicName: string;
  yearsOfExperience: number;
  licenseNumber: string;
  consultationFee: number;
  availability: Record<string, unknown>;
};

type VaccinationPayload = {
  petId: string;
  vaccineName: string;
  category?: string;
  dueDate: Date;
  completedDate?: Date;
  nextDose?: Date;
  dose?: string;
  route?: string;
  veterinarian?: string;
  clinic?: string;
  manufacturer?: string;
  batchNumber?: string;
  certificate?: string;
  notes?: string;
  status?: string;
};

type PetMedicalRecordPayload = {
  petId: string;
  veterinarianId?: string;
  diagnosis: string;
  symptoms: string[];
  medications: unknown[];
  prescriptions: unknown[];
  treatment: string;
  laboratoryReports: unknown[];
  attachments: unknown[];
  visitDate: Date;
  followUpDate?: Date;
};

type AiReportPayload = {
  petId: string;
  symptoms: string[];
  uploadedImages: string[];
  aiSummary: string;
  possibleConditions: string[];
  severity: "low" | "moderate" | "high" | "urgent";
  recommendations: string[];
  generatedAt: Date;
};

type ReviewDecisionPayload = {
  veterinarianReviewStatus?: AiReportReviewStatus;
  decision?: AiReviewDecision;
  notes?: string;
  consultationRequestNote?: string;
  finalAssessment?: {
    condition: string;
    diagnosis?: string;
    evidenceBand?: string;
    summary?: string;
  };
};

type ReviewQueueQuery = ListingQuery & {
  status?: AiReportReviewStatus;
  modality?: "symptom" | "image" | "combined";
  severity?: "low" | "moderate" | "high" | "urgent";
};

type PrescriptionPayload = {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  additionalInstructions?: string;
};

type ConsultationRequestPayload = {
  petId: string;
  veterinarianId: string;
  reason: string;
  preferredDates?: string[];
};

type ConsultationUpdatePayload = {
  status: "requested" | "scheduled" | "completed" | "cancelled";
  notes?: string;
};

type NearbyVeterinarianQuery = {
  lat?: number;
  lng?: number;
  limit?: number;
  search?: string;
  specialization?: string;
};

type ListingQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  ownerId?: string;
  userId?: string;
  species?: string;
  breed?: string;
  age?: number;
  minAge?: number;
  maxAge?: number;
  weight?: number;
  minWeight?: number;
  maxWeight?: number;
  petId?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ReviewPopulate =
  | string
  | { path: string; select?: string; populate?: { path: string; select?: string } }
  | Array<string | { path: string; select?: string; populate?: { path: string; select?: string } }>;

type PaginatedResult<T> = {
  items: T[];
  pagination: Pagination;
};

const isAdmin = (actor: VeterinaryActor): boolean =>
  actor.accountType === "admin" || actor.role === "SUPER_ADMIN" || actor.role === "HOSPITAL_ADMIN";

const hasPermission = (actor: VeterinaryActor, permission: Permission): boolean =>
  actor.permissions.includes(permission);

const requireAnyPermission = (actor: VeterinaryActor, permissions: Permission[]): void => {
  if (permissions.some((permission) => hasPermission(actor, permission))) {
    return;
  }

  throw new AppError("Forbidden", 403);
};

const documentId = (value: { _id: unknown }): string => String(value._id);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listOptions = (query: ListingQuery) => ({
  page: query.page ?? 1,
  limit: query.limit ?? 20,
  search: query.search?.trim() ?? "",
  sort: query.sort ?? "-createdAt"
});

const resolveSort = (
  sort: string,
  allowedFields: readonly string[],
  fallback = "-createdAt"
): Record<string, 1 | -1> => {
  const direction = sort.startsWith("-") ? -1 : 1;
  const field = sort.replace(/^-/, "");

  if (allowedFields.includes(field)) {
    return { [field]: direction };
  }

  const fallbackDirection = fallback.startsWith("-") ? -1 : 1;
  return { [fallback.replace(/^-/, "")]: fallbackDirection };
};

const paginate = async <T>(
  model: {
    find: (filter: Record<string, unknown>) => {
      sort: (sort: Record<string, 1 | -1>) => {
        skip: (skip: number) => { limit: (limit: number) => Promise<T[]> };
      };
      populate: (path: string, select?: string) => unknown;
    };
    countDocuments: (filter: Record<string, unknown>) => Promise<number>;
  },
  filter: Record<string, unknown>,
  query: ListingQuery,
  allowedSortFields: readonly string[],
  fallbackSort = "-createdAt",
  populate?: ReviewPopulate
): Promise<PaginatedResult<T>> => {
  const options = listOptions(query);
  const skip = (options.page - 1) * options.limit;
  let queryBuilder = model
    .find(filter)
    .sort(resolveSort(options.sort, allowedSortFields, fallbackSort))
    .skip(skip)
    .limit(options.limit);

  if (populate) {
    queryBuilder = (queryBuilder as unknown as { populate: (p: typeof populate) => typeof queryBuilder }).populate(populate);
  }

  const [items, total] = await Promise.all([
    queryBuilder,
    model.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages: Math.ceil(total / options.limit)
    }
  };
};

const textSearch = (search: string, fields: string[]): Record<string, unknown> | undefined => {
  if (!search) return undefined;
  const pattern = new RegExp(escapeRegex(search), "i");
  return { $or: fields.map((field) => ({ [field]: pattern })) };
};

const mergeFilters = (...filters: (Record<string, unknown> | undefined)[]): Record<string, unknown> => {
  const activeFilters = filters.filter((filter): filter is Record<string, unknown> =>
    Boolean(filter && Object.keys(filter).length > 0)
  );

  if (activeFilters.length === 0) return {};
  if (activeFilters.length === 1) return activeFilters[0];
  return { $and: activeFilters };
};

const petFieldFilters = (query: ListingQuery): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  if (query.species) filter.species = new RegExp(`^${escapeRegex(query.species)}$`, "i");
  if (query.breed) filter.breed = new RegExp(`^${escapeRegex(query.breed)}$`, "i");
  if (query.age !== undefined) filter.age = query.age;
  if (query.minAge !== undefined || query.maxAge !== undefined) {
    filter.age = {
      ...(query.minAge !== undefined ? { $gte: query.minAge } : {}),
      ...(query.maxAge !== undefined ? { $lte: query.maxAge } : {})
    };
  }
  if (query.weight !== undefined) filter.weight = query.weight;
  if (query.minWeight !== undefined || query.maxWeight !== undefined) {
    filter.weight = {
      ...(query.minWeight !== undefined ? { $gte: query.minWeight } : {}),
      ...(query.maxWeight !== undefined ? { $lte: query.maxWeight } : {})
    };
  }
  return filter;
};

const ensureUserExists = async (userId: string): Promise<void> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
};

const ensureDoctorExists = async (doctorId: string): Promise<void> => {
  const doctor = await DoctorModel.findById(doctorId);
  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }
};

const ownPetOwner = async (actor: VeterinaryActor) => {
  if (actor.accountType !== "patient") {
    throw new AppError("Pet owner profile is available only for patient accounts", 403);
  }

  const owner = await PetOwnerModel.findOneAndUpdate(
    { userId: actor.accountId },
    { $setOnInsert: { userId: actor.accountId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return owner;
};

const ownVeterinarian = async (actor: VeterinaryActor) => {
  if (actor.accountType !== "doctor") {
    throw new AppError("Veterinarian profile is available only for doctor accounts", 403);
  }

  const veterinarian = await VeterinarianModel.findOne({ doctorId: actor.accountId });
  if (!veterinarian) {
    throw new AppError("Veterinarian profile not found", 404);
  }

  return veterinarian;
};

const assignedPetIdsForVeterinarian = async (actor: VeterinaryActor): Promise<string[]> => {
  const veterinarian = await ownVeterinarian(actor);
  const veterinarianId = documentId(veterinarian);
  const [recordPetIds, vaccinationPetIds] = await Promise.all([
    PetMedicalRecordModel.distinct("petId", { veterinarianId }),
    VaccinationModel.distinct("petId", { veterinarian: veterinarianId })
  ]);

  return [...new Set([...recordPetIds, ...vaccinationPetIds].map(String))];
};

const petScopeFilter = async (actor: VeterinaryActor): Promise<Record<string, unknown>> => {
  if (isAdmin(actor)) {
    return {};
  }

  if (actor.accountType === "patient") {
    const owner = await ownPetOwner(actor);
    return { ownerId: documentId(owner) };
  }

  if (actor.accountType === "doctor") {
    return { _id: { $in: await assignedPetIdsForVeterinarian(actor) } };
  }

  throw new AppError("Forbidden", 403);
};

const scopedPetIds = async (actor: VeterinaryActor): Promise<unknown[] | undefined> => {
  if (isAdmin(actor)) {
    return undefined;
  }

  const pets = await PetModel.find(await petScopeFilter(actor)).select("_id");
  return pets.map((pet) => pet._id);
};

const resolvePetOwnerTarget = async (
  actor: VeterinaryActor,
  target: { ownerId?: string; userId?: string } = {}
) => {
  if (!isAdmin(actor)) {
    if (target.ownerId || target.userId) {
      const requested = target.userId ?? "";
      if (requested && requested !== actor.accountId) {
        throw new AppError("Resource not found", 404);
      }
    }

    return ownPetOwner(actor);
  }

  if (target.ownerId) {
    const owner = await PetOwnerModel.findById(target.ownerId);
    if (!owner) throw new AppError("Pet owner profile not found", 404);
    return owner;
  }

  if (target.userId) {
    const owner = await PetOwnerModel.findOne({ userId: target.userId });
    if (!owner) throw new AppError("Pet owner profile not found", 404);
    return owner;
  }

  throw new AppError("Provide ownerId or userId", 400);
};

const canVeterinarianAccessPet = async (
  actor: VeterinaryActor,
  petId: string
): Promise<boolean> => {
  if (actor.accountType !== "doctor") {
    return false;
  }

  const veterinarian = await VeterinarianModel.findOne({ doctorId: actor.accountId });
  if (!veterinarian) {
    return false;
  }

  const veterinarianId = documentId(veterinarian);
  const [record, vaccination] = await Promise.all([
    PetMedicalRecordModel.findOne({ petId, veterinarianId }),
    VaccinationModel.findOne({ petId, veterinarian: veterinarianId })
  ]);

  return Boolean(record || vaccination);
};

const assertPetAccess = async (
  actor: VeterinaryActor,
  petId: string,
  mode: "read" | "manage"
) => {
  const pet = await PetModel.findById(petId);
  if (!pet) {
    throw new AppError("Pet not found", 404);
  }

  if (isAdmin(actor)) {
    return pet;
  }

  if (actor.accountType === "patient") {
    const owner = await ownPetOwner(actor);
    if (String(pet.ownerId) !== documentId(owner)) {
      throw new AppError("Pet not found", 404);
    }
    requireAnyPermission(actor, [mode === "read" ? "users:read" : "users:manage"]);
    return pet;
  }

  if (mode === "read" && (await canVeterinarianAccessPet(actor, petId))) {
    requireAnyPermission(actor, ["reports:read", "appointments:read"]);
    return pet;
  }

  throw new AppError("Pet not found", 404);
};

const assertVeterinarianRecordAccess = async (
  actor: VeterinaryActor,
  veterinarianId: string
): Promise<void> => {
  if (isAdmin(actor)) {
    return;
  }

  const veterinarian = await ownVeterinarian(actor);
  if (documentId(veterinarian) !== veterinarianId) {
    throw new AppError("Resource not found", 404);
  }
};

export const createPetOwner = async (actor: VeterinaryActor, payload: PetOwnerPayload) => {
  requireAnyPermission(actor, ["users:manage"]);
  const userId = isAdmin(actor) ? payload.userId : actor.accountId;

  if (!userId) {
    throw new AppError("userId is required", 400);
  }

  if (!isAdmin(actor) && payload.userId && payload.userId !== actor.accountId) {
    throw new AppError("Forbidden", 403);
  }

  await ensureUserExists(userId);
  const existing = await PetOwnerModel.findOne({ userId });
  if (existing) {
    if (!isAdmin(actor)) {
      return existing;
    }
    throw new AppError("Pet owner profile already exists", 409);
  }

  return new PetOwnerModel({ ...payload, userId }).save();
};

export const getPetOwnerProfile = async (
  actor: VeterinaryActor,
  target: { ownerId?: string; userId?: string }
) => {
  requireAnyPermission(actor, ["users:read"]);
  return resolvePetOwnerTarget(actor, target);
};

export const updatePetOwnerProfile = async (
  actor: VeterinaryActor,
  target: { ownerId?: string; userId?: string },
  payload: Partial<PetOwnerPayload>
) => {
  requireAnyPermission(actor, ["users:manage"]);
  const owner = await resolvePetOwnerTarget(actor, target);
  const updated = await PetOwnerModel.findByIdAndUpdate(documentId(owner), payload, {
    new: true,
    runValidators: true
  });
  if (!updated) throw new AppError("Pet owner profile not found", 404);
  return updated;
};

export const deletePetOwnerProfile = async (
  actor: VeterinaryActor,
  target: { ownerId?: string; userId?: string }
): Promise<void> => {
  requireAnyPermission(actor, ["users:manage"]);
  const owner = await resolvePetOwnerTarget(actor, target);
  const petCount = await PetModel.countDocuments({ ownerId: documentId(owner) });
  if (petCount > 0) {
    throw new AppError("Remove or transfer pets before deleting this owner profile", 409);
  }
  await PetOwnerModel.deleteOne({ _id: owner._id });
};

export const createPet = async (actor: VeterinaryActor, payload: PetPayload) => {
  requireAnyPermission(actor, ["users:manage"]);
  const owner = isAdmin(actor)
    ? await resolvePetOwnerTarget(actor, { ownerId: payload.ownerId })
    : await ownPetOwner(actor);

  if (!isAdmin(actor) && payload.ownerId && payload.ownerId !== documentId(owner)) {
    throw new AppError("Forbidden", 403);
  }

  return new PetModel({ ...payload, ownerId: documentId(owner) }).save();
};

export const listPets = async (
  actor: VeterinaryActor,
  query: ListingQuery
): Promise<PaginatedResult<unknown>> => {
  const options = listOptions(query);
  const searchable = textSearch(options.search, [
    "name",
    "species",
    "breed",
    "color",
    "microchipNumber",
    "vaccinationStatus"
  ]);
  const filters = petFieldFilters(query);

  if (isAdmin(actor)) {
    requireAnyPermission(actor, ["users:read"]);
    return paginate(
      PetModel,
      mergeFilters(query.ownerId ? { ownerId: query.ownerId } : undefined, filters, searchable),
      query,
      ["createdAt", "name", "species", "breed", "age", "weight"],
      "name"
    );
  }

  if (actor.accountType === "patient") {
    requireAnyPermission(actor, ["users:read"]);
    const owner = await ownPetOwner(actor);
    if (query.ownerId && query.ownerId !== documentId(owner)) {
      throw new AppError("Pet not found", 404);
    }
    return paginate(
      PetModel,
      mergeFilters({ ownerId: documentId(owner) }, filters, searchable),
      query,
      ["createdAt", "name", "species", "breed", "age", "weight"],
      "name"
    );
  }

  if (actor.accountType === "doctor") {
    requireAnyPermission(actor, ["reports:read", "appointments:read"]);
    return paginate(
      PetModel,
      mergeFilters({ _id: { $in: await assignedPetIdsForVeterinarian(actor) } }, filters, searchable),
      query,
      ["createdAt", "name", "species", "breed", "age", "weight"],
      "name"
    );
  }

  throw new AppError("Forbidden", 403);
};

export const searchPetOwners = async (
  actor: VeterinaryActor,
  query: ListingQuery
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const options = listOptions(query);
  const matchingUserIds = options.search
    ? await UserModel.find(
        textSearch(options.search, ["name", "email", "phone"]) ?? {}
      ).distinct("_id")
    : [];
  const ownerSearch = options.search
    ? {
        $or: [
          { phone: new RegExp(escapeRegex(options.search), "i") },
          { emergencyContact: new RegExp(escapeRegex(options.search), "i") },
          { emergencyPhone: new RegExp(escapeRegex(options.search), "i") },
          { userId: { $in: matchingUserIds } }
        ]
      }
    : undefined;

  if (isAdmin(actor)) {
    return paginate(
      PetOwnerModel,
      mergeFilters(query.userId ? { userId: query.userId } : undefined, ownerSearch),
      query,
      ["createdAt", "phone", "emergencyContact"],
      "-createdAt"
    );
  }

  if (actor.accountType === "patient") {
    const owner = await ownPetOwner(actor);
    return paginate(
      PetOwnerModel,
      mergeFilters({ _id: owner._id }, ownerSearch),
      query,
      ["createdAt", "phone", "emergencyContact"],
      "-createdAt"
    );
  }

  if (actor.accountType === "doctor") {
    const pets = await PetModel.find(await petScopeFilter(actor)).select("ownerId");
    const ownerIds = [...new Set(pets.map((pet) => String(pet.ownerId)))];
    return paginate(
      PetOwnerModel,
      mergeFilters({ _id: { $in: ownerIds } }, ownerSearch),
      query,
      ["createdAt", "phone", "emergencyContact"],
      "-createdAt"
    );
  }

  throw new AppError("Forbidden", 403);
};

export const getPetById = async (actor: VeterinaryActor, petId: string) => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  return assertPetAccess(actor, petId, "read");
};

export const updatePet = async (
  actor: VeterinaryActor,
  petId: string,
  payload: Partial<PetPayload>
) => {
  requireAnyPermission(actor, ["users:manage"]);
  await assertPetAccess(actor, petId, "manage");
  const update = { ...payload };
  delete update.ownerId;
  const pet = await PetModel.findByIdAndUpdate(petId, update, { new: true, runValidators: true });
  if (!pet) throw new AppError("Pet not found", 404);
  return pet;
};

export const updatePetPhoto = async (
  actor: VeterinaryActor,
  petId: string,
  file: Express.Multer.File
) => {
  requireAnyPermission(actor, ["users:manage"]);
  await assertPetAccess(actor, petId, "manage");

  const profileImage = await uploadImageToCloudinary(file.path, {
    developmentFallbackUrl: DEFAULT_PET_IMAGE
  });

  const pet = await PetModel.findByIdAndUpdate(
    petId,
    { profileImage },
    { new: true, runValidators: true }
  );
  if (!pet) throw new AppError("Pet not found", 404);
  return pet;
};

export const deletePetPhoto = async (actor: VeterinaryActor, petId: string) => {
  requireAnyPermission(actor, ["users:manage"]);
  await assertPetAccess(actor, petId, "manage");

  const pet = await PetModel.findByIdAndUpdate(
    petId,
    { profileImage: "" },
    { new: true, runValidators: true }
  );
  if (!pet) throw new AppError("Pet not found", 404);
  return pet;
};

export const deletePet = async (actor: VeterinaryActor, petId: string): Promise<void> => {
  requireAnyPermission(actor, ["users:manage"]);
  await assertPetAccess(actor, petId, "manage");
  await Promise.all([
    PetModel.deleteOne({ _id: petId }),
    VaccinationModel.deleteMany({ petId }),
    PetMedicalRecordModel.deleteMany({ petId }),
    AIReportModel.deleteMany({ petId })
  ]);
};

export const createVeterinarian = async (actor: VeterinaryActor, payload: VeterinarianPayload) => {
  requireAnyPermission(actor, ["doctors:manage"]);
  await ensureDoctorExists(payload.doctorId);
  const existing = await VeterinarianModel.findOne({ doctorId: payload.doctorId });
  if (existing) {
    throw new AppError("Veterinarian profile already exists for this doctor", 409);
  }
  return new VeterinarianModel(payload).save();
};

export const listVeterinarians = async (
  actor: VeterinaryActor,
  query: ListingQuery = {}
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["doctors:read", "appointments:create"]);
  const search = textSearch(listOptions(query).search, [
    "clinicName",
    "specialization",
    "licenseNumber"
  ]);
  return paginate(
    VeterinarianModel,
    mergeFilters(search),
    query,
    ["createdAt", "clinicName", "yearsOfExperience", "consultationFee"],
    "clinicName"
  );
};

export const getVeterinarianById = async (actor: VeterinaryActor, veterinarianId: string) => {
  requireAnyPermission(actor, ["doctors:read", "appointments:create"]);
  const veterinarian = await VeterinarianModel.findById(veterinarianId);
  if (!veterinarian) throw new AppError("Veterinarian not found", 404);
  return veterinarian;
};

export const updateVeterinarian = async (
  actor: VeterinaryActor,
  veterinarianId: string,
  payload: Partial<VeterinarianPayload>
) => {
  requireAnyPermission(actor, ["doctors:manage"]);
  const veterinarian = await VeterinarianModel.findByIdAndUpdate(veterinarianId, payload, {
    new: true,
    runValidators: true
  });
  if (!veterinarian) throw new AppError("Veterinarian not found", 404);
  return veterinarian;
};

export const deleteVeterinarian = async (
  actor: VeterinaryActor,
  veterinarianId: string
): Promise<void> => {
  requireAnyPermission(actor, ["doctors:manage"]);
  const linkedRecords = await PetMedicalRecordModel.countDocuments({ veterinarianId });
  if (linkedRecords > 0) {
    throw new AppError("Veterinarian has linked pet medical records", 409);
  }
  await VeterinarianModel.deleteOne({ _id: veterinarianId });
};

export const addVaccination = async (actor: VeterinaryActor, payload: VaccinationPayload) => {
  requireAnyPermission(actor, ["users:manage", "appointments:update"]);
  await assertPetAccess(actor, payload.petId, actor.accountType === "doctor" ? "read" : "manage");
  const vaccination = { ...payload };

  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    const veterinarian = await ownVeterinarian(actor);
    vaccination.veterinarian = documentId(veterinarian);
  } else if (vaccination.veterinarian) {
    const veterinarian = await VeterinarianModel.findById(vaccination.veterinarian);
    if (!veterinarian) throw new AppError("Veterinarian not found", 404);
  }

  return new VaccinationModel(vaccination).save();
};

export const updateVaccination = async (
  actor: VeterinaryActor,
  vaccinationId: string,
  payload: Partial<VaccinationPayload>
) => {
  const vaccination = await VaccinationModel.findById(vaccinationId);
  if (!vaccination) throw new AppError("Vaccination not found", 404);

  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    requireAnyPermission(actor, ["appointments:update"]);
    const veterinarian = await ownVeterinarian(actor);
    if (String(vaccination.veterinarian) !== documentId(veterinarian)) {
      throw new AppError("Vaccination not found", 404);
    }
  } else {
    requireAnyPermission(actor, ["users:manage"]);
    await assertPetAccess(actor, String(vaccination.petId), "manage");
  }

  const update = { ...payload };
  delete update.petId;
  return VaccinationModel.findByIdAndUpdate(vaccinationId, update, {
    new: true,
    runValidators: true
  });
};

export const deleteVaccination = async (
  actor: VeterinaryActor,
  vaccinationId: string
): Promise<void> => {
  const vaccination = await VaccinationModel.findById(vaccinationId);
  if (!vaccination) throw new AppError("Vaccination not found", 404);

  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    requireAnyPermission(actor, ["appointments:update"]);
    const veterinarian = await ownVeterinarian(actor);
    if (String(vaccination.veterinarian) !== documentId(veterinarian)) {
      throw new AppError("Vaccination not found", 404);
    }
  } else {
    requireAnyPermission(actor, ["users:manage"]);
    await assertPetAccess(actor, String(vaccination.petId), "manage");
  }

  await VaccinationModel.findByIdAndUpdate(vaccinationId, { isDeleted: true });
};

const VACCINATION_POPULATE = {
  path: "veterinarian",
  populate: { path: "doctorId", select: "name" }
};

const VACCINATION_PET_POPULATE = { path: "petId", select: "name species breed age" };

export const listVaccinationsByPet = async (
  actor: VeterinaryActor,
  petId: string,
  query: ListingQuery = {}
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  await assertPetAccess(actor, petId, "read");
  const filter = actor.accountType === "doctor" && !isAdmin(actor)
    ? { petId, veterinarian: documentId(await ownVeterinarian(actor)) }
    : { petId };
  const search = textSearch(listOptions(query).search, ["vaccineName", "notes"]);
  return paginate(
    VaccinationModel,
    mergeFilters(filter, search),
    query,
    ["createdAt", "dueDate", "completedDate", "nextDose", "vaccineName"],
    "dueDate",
    VACCINATION_POPULATE
  );
};

const computeVaccinationStatus = (vaccination: {
  status?: string;
  completedDate?: Date | string | null;
  dueDate?: Date | string | null;
  nextDose?: Date | string | null;
}): string => {
  if (vaccination.status && vaccination.status !== "up-to-date") {
    return vaccination.status;
  }

  const now = new Date();
  const due = vaccination.dueDate ? new Date(vaccination.dueDate) : null;
  const completed = vaccination.completedDate ? new Date(vaccination.completedDate) : null;
  const next = vaccination.nextDose ? new Date(vaccination.nextDose) : null;

  if (completed && due && completed >= due) {
    return "completed";
  }

  if (next) {
    const diffDays = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return "overdue";
    if (diffDays <= 7) return "due-soon";
    return "up-to-date";
  }

  if (due) {
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return "overdue";
    if (diffDays <= 7) return "due-soon";
    return "up-to-date";
  }

  return "up-to-date";
};

const vaccinationScopeFilter = async (
  actor: VeterinaryActor,
  petId?: string
): Promise<Record<string, unknown>> => {
  const base: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (petId) {
    base.petId = petId;
  } else if (!isAdmin(actor) && actor.accountType === "patient") {
    // Data isolation: without an explicit (ownership-checked) pet filter, a
    // patient may only ever see vaccinations for their own pets. The owner
    // profile is derived from the authenticated account.
    const owner = await ownPetOwner(actor);
    const pets = await PetModel.find({ ownerId: documentId(owner) }).select("_id");
    base.petId = pets.length ? { $in: pets.map((pet) => pet._id) } : { $in: [] };
  }

  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    base.veterinarian = documentId(await ownVeterinarian(actor));
  }

  return base;
};

export const getVaccinationById = async (
  actor: VeterinaryActor,
  vaccinationId: string
): Promise<unknown> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  // Ownership is verified on the raw petId before populating: populating petId
  // replaces it with a document, which would break the access check.
  const vaccination = await VaccinationModel.findById(vaccinationId);
  if (!vaccination || vaccination.isDeleted) {
    throw new AppError("Vaccination not found", 404);
  }

  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    requireAnyPermission(actor, ["appointments:update"]);
    const veterinarian = await ownVeterinarian(actor);
    if (String(vaccination.veterinarian) !== documentId(veterinarian)) {
      throw new AppError("Vaccination not found", 404);
    }
  } else {
    await assertPetAccess(actor, String(vaccination.petId), "read");
  }

  return VaccinationModel.findById(vaccinationId)
    .populate(VACCINATION_POPULATE)
    .populate(VACCINATION_PET_POPULATE);
};

export const getVaccinationStats = async (
  actor: VeterinaryActor,
  petId: string
): Promise<Record<string, unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  await assertPetAccess(actor, petId, "read");
  const filter = await vaccinationScopeFilter(actor, petId);

  const [vaccinations, totalPets] = await Promise.all([
    VaccinationModel.find(filter).sort({ dueDate: 1 }).populate(VACCINATION_POPULATE),
    PetModel.countDocuments(await petScopeFilter(actor))
  ]);

  const stats = {
    total: vaccinations.length,
    upToDate: 0,
    dueSoon: 0,
    overdue: 0,
    completed: 0,
    cancelled: 0
  };

  vaccinations.forEach((vaccination) => {
    const status = computeVaccinationStatus(vaccination);
    if (status === "overdue") stats.overdue += 1;
    else if (status === "due-soon") stats.dueSoon += 1;
    else if (status === "completed") stats.completed += 1;
    else if (status === "cancelled") stats.cancelled += 1;
    else stats.upToDate += 1;
  });

  const nextDue = vaccinations
    .filter((v) => computeVaccinationStatus(v) !== "completed" && computeVaccinationStatus(v) !== "cancelled")
    .sort((a, b) => {
      const aDate = a.nextDose || a.dueDate;
      const bDate = b.nextDose || b.dueDate;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    })[0];

  return {
    ...stats,
    totalPets,
    nextDueDate: nextDue ? nextDue.nextDose || nextDue.dueDate : null,
    nextDueVaccine: nextDue ? nextDue.vaccineName : null,
    nextDuePetId: nextDue ? String(nextDue.petId) : null
  };
};

export const getUpcomingVaccinations = async (
  actor: VeterinaryActor,
  query: ListingQuery = {}
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const now = new Date();
  const filter = await vaccinationScopeFilter(actor);
  const upcomingFilter = {
    ...filter,
    $or: [
      { dueDate: { $gte: now } },
      { nextDose: { $gte: now } }
    ]
  };
  const search = textSearch(listOptions(query).search, ["vaccineName", "notes"]);
  return paginate(
    VaccinationModel,
    mergeFilters(upcomingFilter, search),
    query,
    ["dueDate", "nextDose", "createdAt", "vaccineName"],
    "dueDate",
    [VACCINATION_POPULATE, VACCINATION_PET_POPULATE]
  );
};

export const getOverdueVaccinations = async (
  actor: VeterinaryActor,
  query: ListingQuery = {}
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const now = new Date();
  const filter = await vaccinationScopeFilter(actor);
  const overdueFilter = {
    ...filter,
    $or: [
      { dueDate: { $lt: now }, completedDate: { $exists: false } },
      { nextDose: { $lt: now }, completedDate: { $exists: false } }
    ]
  };
  const search = textSearch(listOptions(query).search, ["vaccineName", "notes"]);
  return paginate(
    VaccinationModel,
    mergeFilters(overdueFilter, search),
    query,
    ["dueDate", "nextDose", "createdAt", "vaccineName"],
    "dueDate",
    [VACCINATION_POPULATE, VACCINATION_PET_POPULATE]
  );
};

export const createPetMedicalRecord = async (
  actor: VeterinaryActor,
  payload: PetMedicalRecordPayload
) => {
  requireAnyPermission(actor, ["appointments:update"]);
  await assertPetAccess(actor, payload.petId, actor.accountType === "doctor" ? "read" : "manage");
  const veterinarianId = isAdmin(actor)
    ? payload.veterinarianId
    : documentId(await ownVeterinarian(actor));

  if (!veterinarianId) {
    throw new AppError("veterinarianId is required", 400);
  }

  await assertVeterinarianRecordAccess(actor, veterinarianId);
  return new PetMedicalRecordModel({ ...payload, veterinarianId }).save();
};

export const updatePetMedicalRecord = async (
  actor: VeterinaryActor,
  recordId: string,
  payload: Partial<PetMedicalRecordPayload>
) => {
  requireAnyPermission(actor, ["appointments:update"]);
  const record = await PetMedicalRecordModel.findById(recordId);
  if (!record) throw new AppError("Pet medical record not found", 404);
  await assertVeterinarianRecordAccess(actor, String(record.veterinarianId));
  const updated = await PetMedicalRecordModel.findByIdAndUpdate(recordId, payload, {
    new: true,
    runValidators: true
  });
  if (!updated) throw new AppError("Pet medical record not found", 404);
  return updated;
};

export const deletePetMedicalRecord = async (
  actor: VeterinaryActor,
  recordId: string
): Promise<void> => {
  requireAnyPermission(actor, ["appointments:update"]);
  const record = await PetMedicalRecordModel.findById(recordId);
  if (!record) throw new AppError("Pet medical record not found", 404);
  await assertVeterinarianRecordAccess(actor, String(record.veterinarianId));
  await PetMedicalRecordModel.deleteOne({ _id: recordId });
};

export const getPetHistory = async (
  actor: VeterinaryActor,
  petId: string,
  query: ListingQuery = {}
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  await assertPetAccess(actor, petId, "read");
  const filter = actor.accountType === "doctor" && !isAdmin(actor)
    ? { petId, veterinarianId: documentId(await ownVeterinarian(actor)) }
    : { petId };
  const search = textSearch(listOptions(query).search, [
    "diagnosis",
    "symptoms",
    "treatment",
    "medications.name",
    "prescriptions.medicationName"
  ]);
  return paginate(
    PetMedicalRecordModel,
    mergeFilters(filter, search),
    query,
    ["createdAt", "visitDate", "followUpDate", "diagnosis"],
    "-visitDate"
  );
};

export const getPetMedicalRecordById = async (actor: VeterinaryActor, recordId: string) => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const record = await PetMedicalRecordModel.findById(recordId);
  if (!record) throw new AppError("Pet medical record not found", 404);
  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    await assertVeterinarianRecordAccess(actor, String(record.veterinarianId));
    return record;
  }
  await assertPetAccess(actor, String(record.petId), "read");
  return record;
};

export const createAiReport = async (actor: VeterinaryActor, payload: AiReportPayload) => {
  requireAnyPermission(actor, ["users:manage", "appointments:update"]);
  await assertPetAccess(actor, payload.petId, actor.accountType === "doctor" ? "read" : "manage");
  return new AIReportModel(payload).save();
};

export const listAiReports = async (
  actor: VeterinaryActor,
  query: ListingQuery
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const search = textSearch(listOptions(query).search, [
    "symptoms",
    "aiSummary",
    "possibleConditions",
    "recommendations"
  ]);

  if (query.petId) {
    await assertPetAccess(actor, query.petId, "read");
    return paginate(
      AIReportModel,
      mergeFilters({ petId: query.petId }, search),
      query,
      ["createdAt", "generatedAt", "severity"],
      "-generatedAt"
    );
  }

  if (isAdmin(actor)) {
    return paginate(
      AIReportModel,
      mergeFilters(search),
      query,
      ["createdAt", "generatedAt", "severity"],
      "-generatedAt"
    );
  }

  if (actor.accountType === "patient") {
    const owner = await ownPetOwner(actor);
    const pets = await PetModel.find({ ownerId: documentId(owner) }).select("_id");
    return paginate(
      AIReportModel,
      mergeFilters({ petId: { $in: pets.map((pet) => pet._id) } }, search),
      query,
      ["createdAt", "generatedAt", "severity"],
      "-generatedAt"
    );
  }

  const veterinarian = await ownVeterinarian(actor);
  const petIds = await PetMedicalRecordModel.distinct("petId", {
    veterinarianId: documentId(veterinarian)
  });
  return paginate(
    AIReportModel,
    mergeFilters({ petId: { $in: petIds } }, search),
    query,
    ["createdAt", "generatedAt", "severity"],
    "-generatedAt"
  );
};

export const getAiReportById = async (actor: VeterinaryActor, reportId: string) => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const report = await AIReportModel.findById(reportId);
  if (!report) throw new AppError("AI report not found", 404);
  await assertPetAccess(actor, String(report.petId), "read");
  return report;
};

export const deleteAiReport = async (actor: VeterinaryActor, reportId: string): Promise<void> => {
  requireAnyPermission(actor, ["users:manage"]);
  const report = await AIReportModel.findById(reportId);
  if (!report) throw new AppError("AI report not found", 404);
  await assertPetAccess(actor, String(report.petId), "manage");
  await AIReportModel.deleteOne({ _id: reportId });
};

export const updateAiReportReviewStatus = async (
  actor: VeterinaryActor,
  reportId: string,
  payload: ReviewDecisionPayload
) => {
  requireAnyPermission(actor, ["appointments:update"]);
  const report = await AIReportModel.findById(reportId);
  if (!report) throw new AppError("AI report not found", 404);
  await assertPetAccess(actor, String(report.petId), actor.accountType === "doctor" ? "read" : "manage");

  // Defense-in-depth: the route layer validates with zod; the service does the
  // same so no invalid decision/status can ever reach the persistence layer.
  if (
    payload.decision !== undefined &&
    !(AI_REVIEW_DECISIONS as readonly string[]).includes(payload.decision)
  ) {
    throw new AppError("Invalid review decision", 400);
  }
  if (
    payload.veterinarianReviewStatus !== undefined &&
    !(AI_REPORT_REVIEW_STATUSES as readonly string[]).includes(payload.veterinarianReviewStatus)
  ) {
    throw new AppError("Invalid review status", 400);
  }

  const previousStatus = report.veterinarianReviewStatus ?? "pending";
  const resolvedStatus: AiReportReviewStatus =
    payload.veterinarianReviewStatus ??
    deriveStatusFromDecision(payload.decision, previousStatus);
  const resolvedDecision: AiReviewDecision =
    payload.decision ?? deriveDecisionFromStatus(resolvedStatus);

  if (
    (resolvedStatus === "approved" || resolvedStatus === "modified") &&
    !payload.finalAssessment?.condition
  ) {
    throw new AppError(
      "A final veterinarian assessment (condition) is required when approving or overriding an AI report",
      400
    );
  }

  const reviewer = await resolveReviewerIdentity(actor);
  const now = new Date();

  // The update NEVER touches `prediction` / `combinedAssessment` /
  // `imageAssessment` — the original AI result stays immutable.
  const update: Record<string, unknown> = { veterinarianReviewStatus: resolvedStatus };
  const reviewPath = "veterinarianReview.";

  if (resolvedStatus === "in_review") {
    update[`${reviewPath}startedAt`] = report.veterinarianReview?.startedAt ?? now;
    update[`${reviewPath}previousStatus`] = previousStatus;
    update[`${reviewPath}decision`] = "in_review";
    update[`${reviewPath}status`] = "in_review";
  } else {
    update[`${reviewPath}veterinarianId`] = reviewer.veterinarianId ?? null;
    update[`${reviewPath}reviewerAccountId`] = actor.accountId;
    update[`${reviewPath}reviewerAccountType`] = actor.accountType;
    update[`${reviewPath}reviewerName`] = reviewer.reviewerName;
    update[`${reviewPath}reviewedAt`] = now;
    update[`${reviewPath}previousStatus`] = previousStatus;
    update[`${reviewPath}decision`] = resolvedDecision;
    update[`${reviewPath}status`] = resolvedStatus;
    update[`${reviewPath}aiPredictionSnapshot`] = {
      predictedCondition: String(report.prediction?.predictedCondition ?? ""),
      modelProbability: Number(report.prediction?.modelProbability ?? 0),
      confidenceLevel: String(report.prediction?.confidenceLevel ?? ""),
      modality: report.modality ?? "symptom"
    };
    if (payload.notes !== undefined) update[`${reviewPath}notes`] = payload.notes;
    if (payload.consultationRequestNote !== undefined) {
      update[`${reviewPath}consultationRequestNote`] = payload.consultationRequestNote;
    }
    if (payload.finalAssessment) update[`${reviewPath}finalAssessment`] = payload.finalAssessment;
  }

  const updated = await AIReportModel.findByIdAndUpdate(reportId, update, {
    new: true,
    runValidators: true
  });
  if (!updated) throw new AppError("AI report not found", 404);

  // Auditable trail: who, when, previous status, what the AI predicted, and
  // what the veterinarian decided. Audit capture failure never breaks the review.
  await writeAuditLog({
    eventType: REVIEW_EVENT_BY_STATUS[resolvedStatus] as AuditEventType,
    actor: { accountId: actor.accountId, accountType: actor.accountType, role: actor.role },
    target: { type: "ai_report", id: reportId },
    metadata: {
      previousStatus,
      status: resolvedStatus,
      decision: resolvedDecision,
      hasNotes: Boolean(payload.notes),
      hasFinalAssessment: Boolean(payload.finalAssessment),
      aiPredictionSnapshot: {
        predictedCondition: String(report.prediction?.predictedCondition ?? ""),
        confidenceLevel: String(report.prediction?.confidenceLevel ?? "")
      }
    }
  }).catch(() => undefined);

  return updated;
};

const REVIEW_EVENT_BY_STATUS: Record<string, string> = {
  in_review: "ai_report.review_started",
  approved: "ai_report.approved",
  modified: "ai_report.modified",
  dismissed: "ai_report.dismissed",
  consultation_required: "ai_report.consultation_requested",
  reviewed: "ai_report.approved"
};

const deriveDecisionFromStatus = (status: AiReportReviewStatus): AiReviewDecision => {
  switch (status) {
    case "in_review":
      return "in_review";
    case "approved":
    case "reviewed":
      return "approve";
    case "modified":
      return "modify";
    case "dismissed":
      return "dismiss";
    case "consultation_required":
      return "consultation_requested";
    default:
      throw new AppError("A review decision is required", 400);
  }
};

const deriveStatusFromDecision = (
  decision: AiReviewDecision | undefined,
  fallback: AiReportReviewStatus
): AiReportReviewStatus => {
  switch (decision) {
    case "in_review":
      return "in_review";
    case "approve":
      return "approved";
    case "modify":
      return "modified";
    case "dismiss":
      return "dismissed";
    case "consultation_requested":
      return "consultation_required";
    default:
      return fallback;
  }
};

/**
 * Reviewer identity is ALWAYS derived from the authenticated session — never
 * from the request body. Doctors resolve their veterinarians profile + name;
 * admins review as "Hospital Administrator".
 */
const resolveReviewerIdentity = async (actor: VeterinaryActor): Promise<{
  veterinarianId?: string;
  reviewerName: string;
}> => {
  if (actor.accountType === "doctor") {
    const [veterinarian, doctor] = await Promise.all([
      VeterinarianModel.findOne({ doctorId: actor.accountId }),
      DoctorModel.findById(actor.accountId)
    ]);
    return {
      veterinarianId: veterinarian ? documentId(veterinarian) : undefined,
      reviewerName: doctor?.name ? String(doctor.name) : "Veterinarian"
    };
  }

  return { veterinarianId: undefined, reviewerName: "Hospital Administrator" };
};

const ownPatientUserId = async (actor: VeterinaryActor): Promise<string> => {
  if (actor.accountType !== "patient") {
    throw new AppError("Only pet owner accounts can request consultations", 403);
  }
  return actor.accountId;
};

export const getVeterinaryDashboardStats = async (
  actor: VeterinaryActor
): Promise<Record<string, unknown>> => {
  requireAnyPermission(actor, ["users:read", "doctors:read", "reports:read", "appointments:read"]);
  const petFilter = await petScopeFilter(actor);
  const petIds = await scopedPetIds(actor);
  const scopedPetFilter = petIds ? { petId: { $in: petIds } } : {};
  const veterinarian = actor.accountType === "doctor" && !isAdmin(actor)
    ? await ownVeterinarian(actor)
    : undefined;
  const veterinarianFilter = veterinarian ? { veterinarianId: documentId(veterinarian) } : {};
  const vaccinationVeterinarianFilter = veterinarian ? { veterinarian: documentId(veterinarian) } : {};

  const [
    totalPets,
    totalPetOwners,
    totalVeterinarians,
    totalVaccinations,
    totalAiReports,
    recentMedicalRecords
  ] = await Promise.all([
    PetModel.countDocuments(petFilter),
    isAdmin(actor)
      ? PetOwnerModel.countDocuments({})
      : PetOwnerModel.countDocuments({
          _id: {
            $in: [
              ...new Set(
                (await PetModel.find(petFilter).select("ownerId")).map((pet) => String(pet.ownerId))
              )
            ]
          }
        }),
    isAdmin(actor)
      ? VeterinarianModel.countDocuments({})
      : actor.accountType === "doctor"
        ? VeterinarianModel.countDocuments({ doctorId: actor.accountId })
        : 0,
    VaccinationModel.countDocuments(mergeFilters(scopedPetFilter, vaccinationVeterinarianFilter)),
    AIReportModel.countDocuments(scopedPetFilter),
    PetMedicalRecordModel.find(mergeFilters(scopedPetFilter, veterinarianFilter))
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(10)
  ]);

  return {
    totalPets,
    totalPetOwners,
    totalVeterinarians,
    totalVaccinations,
    totalAiReports,
    recentMedicalRecords
  };
};

export const getVeterinaryDashboardSummary = async (
  actor: VeterinaryActor
): Promise<Record<string, unknown>> => {
  const stats = await getVeterinaryDashboardStats(actor);
  const petIds = await scopedPetIds(actor);
  const scopedPetFilter = petIds ? { petId: { $in: petIds } } : {};
  const veterinarian = actor.accountType === "doctor" && !isAdmin(actor)
    ? await ownVeterinarian(actor)
    : undefined;

  const [recentVaccinations, recentAiReports] = await Promise.all([
    VaccinationModel.find(
      mergeFilters(scopedPetFilter, veterinarian ? { veterinarian: documentId(veterinarian) } : {})
    )
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(10)
      .populate(VACCINATION_POPULATE),
    AIReportModel.find(scopedPetFilter).sort({ generatedAt: -1 }).limit(10)
  ]);

  return {
    stats,
    recentVaccinations,
    recentAiReports,
    preliminaryAssessmentNotice:
      "AI reports are preliminary assessment reports only and are not a diagnosis."
  };
};

/** Stage 4 — veterinarian-facing review queue (combined reports primary). */
export const listVeterinarianReviewQueue = async (
  actor: VeterinaryActor,
  query: ReviewQueueQuery = {}
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["reports:read", "appointments:read"]);

  const search = textSearch(listOptions(query).search, ["aiSummary", "possibleConditions", "symptoms"]);
  const statusFilter = query.status ? { veterinarianReviewStatus: query.status } : {};
  const modalityFilter = query.modality ? { modality: query.modality } : {};
  const severityFilter = query.severity ? { severity: query.severity } : {};

  const petFilter: Record<string, unknown> = {};
  if (query.petId) {
    await assertPetAccess(actor, query.petId, "read");
    petFilter.petId = query.petId;
  } else if (actor.accountType === "patient") {
    const owner = await ownPetOwner(actor);
    const pets = await PetModel.find({ ownerId: documentId(owner) }).select("_id");
    petFilter.petId = pets.length ? { $in: pets.map((pet) => pet._id) } : { $in: [] };
  } else if (actor.accountType === "doctor" && !isAdmin(actor)) {
    const petIds = await scopedPetIds(actor);
    petFilter.petId = petIds && petIds.length ? { $in: petIds } : { $in: [] };
  }

  return paginate(
    AIReportModel,
    mergeFilters(petFilter, statusFilter, modalityFilter, severityFilter, search),
    query,
    ["createdAt", "generatedAt", "severity", "veterinarianReviewStatus"],
    "-generatedAt",
    { path: "petId", select: "name species breed age gender ownerId" }
  );
};

/**
 * Stage 4 — unified clinical review workspace for ONE report: pet info +
 * symptom evidence + image evidence + combined AI assessment + previous AI
 * reports + the immutable veterinary review record.
 */
export const getVeterinarianReviewDetail = async (
  actor: VeterinaryActor,
  reportId: string
): Promise<Record<string, unknown>> => {
  requireAnyPermission(actor, ["reports:read", "appointments:read"]);
  const report = await AIReportModel.findById(reportId).populate({
    path: "petId",
    select: "name species breed gender age weight allergies medicalHistory profileImage"
  });
  if (!report) throw new AppError("AI report not found", 404);
  await assertPetAccess(actor, String(report.petId?._id ?? report.petId), "read");

  const pet = report.petId as unknown;

  const previousReports = await AIReportModel.find({
    petId: report.petId,
    _id: { $ne: report._id }
  })
    .sort({ generatedAt: -1 })
    .limit(20)
    .select("prediction.predictedCondition modality generatedAt veterinarianReviewStatus");

  const combinedInputs = (report.combinedAssessment?.inputs as Record<string, unknown>) ?? {};
  const hasImageEvidence = Boolean(
    (Array.isArray(report.uploadedImages) && report.uploadedImages.length > 0) ||
      report.modality === "image" ||
      combinedInputs.image
  );

  return {
    report,
    pet,
    previousReports,
    hasImageEvidence,
    safetyWarning:
      "This AI Report is a Preliminary Assessment and must not be considered a diagnosis."
  };
};

/**
 * Stage 4 — prescription foundation. Only an authenticated veterinarian
 * (doctor profile) or a hospital admin may create a prescription, and only
 * after the report reached an approved/modified/reviewed state. The AI model
 * never generates prescriptions.
 */
export const createVeterinaryPrescription = async (
  actor: VeterinaryActor,
  reportId: string,
  payload: PrescriptionPayload
) => {
  requireAnyPermission(actor, ["appointments:update"]);
  // Only an authenticated veterinarian (doctor profile) may issue a
  // prescription — the AI model never generates one.
  if (actor.accountType !== "doctor") {
    throw new AppError("Only a veterinarian can create a prescription", 403);
  }
  const veterinarian = await ownVeterinarian(actor);

  const report = await AIReportModel.findById(reportId);
  if (!report) throw new AppError("AI report not found", 404);
  await assertPetAccess(actor, String(report.petId), "read");

  if (!["approved", "modified", "reviewed"].includes(report.veterinarianReviewStatus ?? "")) {
    throw new AppError(
      "A prescription can only be issued for a veterinarian-approved or modified AI report",
      409
    );
  }

  const prescription = await new VeterinaryPrescriptionModel({
    petId: report.petId,
    aiReportId: reportId,
    veterinarianId: documentId(veterinarian),
    issuedByAccountId: actor.accountId,
    issuedByAccountType: actor.accountType,
    medicineName: payload.medicineName,
    dosage: payload.dosage,
    frequency: payload.frequency,
    duration: payload.duration,
    route: payload.route ?? "",
    additionalInstructions: payload.additionalInstructions ?? "",
    reviewDecision: report.veterinarianReview?.decision === "modify" ? "modify" : "approve",
    issuedAt: new Date(),
    status: "active"
  }).save();

  await writeAuditLog({
    eventType: "prescription.created" as AuditEventType,
    actor: { accountId: actor.accountId, accountType: actor.accountType, role: actor.role },
    target: { type: "ai_report", id: reportId },
    metadata: {
      prescriptionId: String(prescription._id),
      petId: String(report.petId),
      medicineName: payload.medicineName,
      reportStatus: report.veterinarianReviewStatus
    }
  }).catch(() => undefined);

  return prescription;
};

export const listVeterinaryPrescriptions = async (
  actor: VeterinaryActor,
  query: ListingQuery & { petId?: string; aiReportId?: string }
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const filter: Record<string, unknown> = {};
  if (query.petId) {
    await assertPetAccess(actor, query.petId, "read");
    filter.petId = query.petId;
  }
  if (query.aiReportId) {
    const report = await AIReportModel.findById(query.aiReportId);
    if (!report) throw new AppError("AI report not found", 404);
    await assertPetAccess(actor, String(report.petId), "read");
    filter.aiReportId = query.aiReportId;
  }
  if (!isAdmin(actor) && actor.accountType === "doctor") {
    const veterinarian = await ownVeterinarian(actor);
    filter.veterinarianId = documentId(veterinarian);
  }
  if (!isAdmin(actor) && actor.accountType === "patient" && !filter.petId && !filter.aiReportId) {
    // Data isolation: without an explicit (ownership-checked) pet filter, a
    // patient may only ever list prescriptions for their own pets.
    const owner = await ownPetOwner(actor);
    const pets = await PetModel.find({ ownerId: documentId(owner) }).select("_id");
    filter.petId = pets.length ? { $in: pets.map((pet) => pet._id) } : { $in: [] };
  }
  return paginate(
    VeterinaryPrescriptionModel,
    filter,
    query,
    ["createdAt", "issuedAt"],
    "-issuedAt"
  );
};

export const getVeterinaryPrescriptionById = async (actor: VeterinaryActor, prescriptionId: string) => {
  requireAnyPermission(actor, ["users:read", "reports:read", "appointments:read"]);
  const prescription = await VeterinaryPrescriptionModel.findById(prescriptionId);
  if (!prescription) throw new AppError("Prescription not found", 404);
  await assertPetAccess(actor, String(prescription.petId), "read");
  if (actor.accountType === "doctor" && !isAdmin(actor)) {
    const veterinarian = await ownVeterinarian(actor);
    if (String(prescription.veterinarianId) !== documentId(veterinarian)) {
      throw new AppError("Prescription not found", 404);
    }
  }
  return prescription;
};

/**
 * Stage 4 — online consultation foundation. Owners request a consultation;
 * veterinarians/admin explicitly and audibly transition the status.
 */
export const createConsultationRequest = async (
  actor: VeterinaryActor,
  payload: ConsultationRequestPayload
) => {
  requireAnyPermission(actor, ["users:manage", "appointments:create"]);

  await assertPetAccess(actor, payload.petId, actor.accountType === "patient" ? "read" : "manage");
  const requestedVeterinarian = await VeterinarianModel.findById(payload.veterinarianId);
  if (!requestedVeterinarian) throw new AppError("Veterinarian not found", 404);

  const requesterUserId =
    actor.accountType === "patient" ? await ownPatientUserId(actor) : undefined;
  const owner = await PetModel.findById(payload.petId).select("ownerId");
  const ownerProfile = owner
    ? await PetOwnerModel.findById(String(owner.ownerId)).select("userId")
    : null;
  const ownerUserId = requesterUserId ?? (ownerProfile?.userId ? String(ownerProfile.userId) : undefined);

  if (!ownerUserId) {
    throw new AppError("Unable to resolve the requesting pet owner account", 403);
  }

  const request = await new ConsultationRequestModel({
    petId: payload.petId,
    requesterUserId: ownerUserId,
    veterinarianId: payload.veterinarianId,
    reason: payload.reason,
    preferredDates: payload.preferredDates ?? [],
    status: "requested",
    requestedAt: new Date()
  }).save();

  await writeAuditLog({
    eventType: "consultation.requested" as AuditEventType,
    actor: { accountId: actor.accountId, accountType: actor.accountType, role: actor.role },
    target: { type: "consultation", id: String(request._id) },
    metadata: { petId: payload.petId, veterinarianId: payload.veterinarianId }
  }).catch(() => undefined);

  return request;
};

export const listConsultationRequests = async (
  actor: VeterinaryActor,
  query: ListingQuery & { status?: string }
): Promise<PaginatedResult<unknown>> => {
  requireAnyPermission(actor, ["appointments:read"]);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  if (isAdmin(actor)) {
    // Administrators review all consultation requests.
  } else if (actor.accountType === "doctor") {
    const veterinarian = await ownVeterinarian(actor);
    filter.veterinarianId = documentId(veterinarian);
  } else if (actor.accountType === "patient") {
    filter.requesterUserId = actor.accountId;
  } else {
    throw new AppError("Forbidden", 403);
  }

  return paginate(
    ConsultationRequestModel,
    filter,
    query,
    ["createdAt", "requestedAt", "status"],
    "-requestedAt"
  );
};

export const updateConsultationRequestStatus = async (
  actor: VeterinaryActor,
  consultationId: string,
  payload: ConsultationUpdatePayload
) => {
  requireAnyPermission(actor, ["appointments:update"]);
  const consultation = await ConsultationRequestModel.findById(consultationId);
  if (!consultation) throw new AppError("Consultation request not found", 404);

  if (!isAdmin(actor)) {
    if (actor.accountType === "patient") {
      throw new AppError("Only a veterinarian can update consultation status", 403);
    }
    const veterinarian = await ownVeterinarian(actor);
    if (String(consultation.veterinarianId) !== documentId(veterinarian)) {
      throw new AppError("Consultation request not found", 404);
    }
  }

  const update: Record<string, unknown> = {
    status: payload.status,
    decidedByAccountId: actor.accountId,
    decidedAt: new Date()
  };
  if (payload.notes !== undefined) update.notes = payload.notes;

  const updated = await ConsultationRequestModel.findByIdAndUpdate(consultationId, update, {
    new: true,
    runValidators: true
  });
  if (!updated) throw new AppError("Consultation request not found", 404);

  await writeAuditLog({
    eventType: "consultation.status_changed" as AuditEventType,
    actor: { accountId: actor.accountId, accountType: actor.accountType, role: actor.role },
    target: { type: "consultation", id: consultationId },
    metadata: { previousStatus: consultation.status, status: payload.status }
  }).catch(() => undefined);

  return updated;
};

/** Great-circle distance in km between two lat/lng pairs (haversine). */
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (value: number): number => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Stage 4 — nearby veterinarian discovery service boundary.
 *
 * Returns REAL veterinarian records (never hard-coded clinics). When client
 * coordinates (obtained via the owner's location permission) are supplied and
 * a veterinarian has recorded a location, results are ordered nearest-first
 * with a computed `distanceKm`. Records without coordinates stay visible so no
 * veterinarian is hidden by missing location data.
 */
export const nearbyVeterinarians = async (
  actor: VeterinaryActor,
  query: NearbyVeterinarianQuery = {}
): Promise<unknown[]> => {
  requireAnyPermission(actor, ["doctors:read", "appointments:read"]);

  const filter: Record<string, unknown> = {};
  const hasCoordinates =
    typeof query.lat === "number" &&
    typeof query.lng === "number" &&
    Number.isFinite(query.lat) &&
    Number.isFinite(query.lng);

  const search = textSearch(query.search ?? "", ["clinicName", "specialization"]);
  if (query.specialization) {
    filter.specialization = new RegExp(`^${escapeRegex(query.specialization)}$`, "i");
  }
  if (search && Array.isArray(search.$or)) {
    filter.$or = search.$or;
  }

  const limit = query.limit ?? 20;
  const veterinarians = await VeterinarianModel.find(filter)
    .limit(limit)
    .select(
      "doctorId specialization clinicName yearsOfExperience consultationFee consultationAvailable availability location"
    );

  const items = veterinarians.map((veterinarian) => {
    const vet = veterinarian as unknown as {
      _id: unknown;
      specialization?: string[];
      clinicName?: string;
      yearsOfExperience?: number;
      consultationFee?: number;
      consultationAvailable?: boolean;
      availability?: { enabled?: boolean };
      location?: { lat?: number; lng?: number; address?: string };
    };
    const location = vet.location ?? {};
    const distanceKm =
      hasCoordinates && typeof location.lat === "number" && typeof location.lng === "number"
        ? Math.round(
            haversineKm(query.lat as number, query.lng as number, location.lat, location.lng) * 100
          ) / 100
        : undefined;

    return {
      veterinarianId: String(vet._id),
      clinicName: vet.clinicName ?? "",
      specialization: vet.specialization ?? [],
      yearsOfExperience: vet.yearsOfExperience ?? 0,
      consultationFee: vet.consultationFee ?? 0,
      consultationAvailable: vet.consultationAvailable ?? false,
      available: vet.availability?.enabled ?? true,
      address: location.address ?? undefined,
      location:
        typeof location.lat === "number" && typeof location.lng === "number"
          ? { lat: location.lat, lng: location.lng }
          : {},
      distanceKm
    };
  });

  if (hasCoordinates) {
    items.sort((a, b) => {
      const da = (a as { distanceKm?: number }).distanceKm;
      const db = (b as { distanceKm?: number }).distanceKm;
      if (da === undefined && db === undefined) return 0;
      if (da === undefined) return 1;
      if (db === undefined) return -1;
      return da - db;
    });
  }

  return items;
};
