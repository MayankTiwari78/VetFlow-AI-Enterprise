import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/database.js";
import { env } from "../config/env.js";
import { DEFAULT_DOCTOR_IMAGE, DEFAULT_USER_IMAGE } from "../constants/defaults.js";
import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole } from "../constants/rbac.js";
import DoctorModel, { type DoctorDocument } from "../models/Doctor.js";
import OrganizationMembershipModel from "../models/OrganizationMembership.js";
import UserModel, { type UserDocument } from "../models/User.js";
import { defaultDoctorAvailability } from "../services/availabilityService.js";
import { getOrCreateDefaultOrganization } from "../services/organizationService.js";
import type { Address, DoctorAvailability } from "../types/domain.js";
import { normalizeEmail } from "../utils/authCrypto.js";

const DEMO_PREFIX = "veterinary-demo:";
const DEMO_DATA_LABEL = "Veterinary demo data";
const DEMO_PASSWORD = "DemoData!2026";

interface SeedCounters {
  doctorsCreated: number;
  doctorsSkipped: number;
  veterinariansCreated: number;
  veterinariansSkipped: number;
  ownersCreated: number;
  ownersSkipped: number;
  petsCreated: number;
  petsSkipped: number;
  vaccinationsCreated: number;
  vaccinationsSkipped: number;
  medicalRecordsCreated: number;
  medicalRecordsSkipped: number;
  membershipsCreated: number;
  membershipsSkipped: number;
}

interface DoctorSeed {
  key: string;
  name: string;
  email: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  fees: number;
  address: Address;
  availability: DoctorAvailability;
}

interface VeterinarianSeed {
  key: string;
  doctorKey: string;
  specialization: string[];
  clinicName: string;
  yearsOfExperience: number;
  licenseNumber: string;
  consultationFee: number;
}

interface OwnerSeed {
  key: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  address: Address;
  emergencyContact: string;
  emergencyPhone: string;
}

interface PetSeed {
  key: string;
  ownerKey: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  age: number;
  weight: number;
  color: string;
  dateOfBirth: string;
  microchipNumber: string;
  vaccinationStatus: string;
  allergies: string[];
  medicalHistory: string[];
  profileImage: string;
}

interface VaccinationSeed {
  key: string;
  petKey: string;
  vaccineName: string;
  dueDate: string;
  completedDate?: string;
  nextDose?: string;
  veterinarianKey?: string;
  notes: string;
}

interface MedicalRecordSeed {
  key: string;
  petKey: string;
  veterinarianKey: string;
  diagnosis: string;
  symptoms: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  prescriptions: Array<{
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  treatment: string;
  laboratoryReports: Array<{
    title: string;
    reportType?: string;
    result?: string;
  }>;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType?: string;
  }>;
  visitDate: string;
  followUpDate?: string;
}

const assertDemoSeedAllowed = (): void => {
  if (!env.isDevelopment || env.NODE_ENV !== "development") {
    throw new Error("Veterinary demo seed is allowed only when NODE_ENV=development.");
  }

  if (process.env.ALLOW_VETERINARY_DEMO_SEED !== "true") {
    throw new Error(
      "Veterinary demo seed is opt-in only. Set ALLOW_VETERINARY_DEMO_SEED=true for this command."
    );
  }
};

const taggedKey = (suffix: string): string => `${DEMO_PREFIX}${suffix}`;

const pastDate = (daysAgo: number): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const futureDate = (daysAhead: number): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
};

const weekdayAvailability = (slots: string[]): DoctorAvailability => ({
  ...defaultDoctorAvailability(),
  weeklySchedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, slots }))
});

const doctors: DoctorSeed[] = [
  {
    key: taggedKey("doctor-meera-rao"),
    name: "[Demo data] Dr. Meera Rao",
    email: "demo.vet.meera@medflow.local",
    speciality: "General Veterinary Medicine",
    degree: "BVSc & AH, MVSc",
    experience: "12 Years",
    about: "Demo data - fictional veterinarian for local veterinary workflows.",
    fees: 600,
    address: {
      line1: "Demo data - Room 201, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["09:30", "10:00", "10:30", "15:00", "15:30"])
  },
  {
    key: taggedKey("doctor-arjun-sen"),
    name: "[Demo data] Dr. Arjun Sen",
    email: "demo.vet.arjun@medflow.local",
    speciality: "Small Animal Surgery",
    degree: "BVSc & AH, MS Surgery",
    experience: "10 Years",
    about: "Demo data - fictional veterinary surgeon for local workflows.",
    fees: 800,
    address: {
      line1: "Demo data - Room 108, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["11:00", "11:30", "16:00", "16:30"])
  },
  {
    key: taggedKey("doctor-priya-nair"),
    name: "[Demo data] Dr. Priya Nair",
    email: "demo.vet.priya@medflow.local",
    speciality: "Veterinary Dermatology",
    degree: "BVSc & AH, MVSc Dermatology",
    experience: "8 Years",
    about: "Demo data - fictional veterinary dermatologist for local workflows.",
    fees: 700,
    address: {
      line1: "Demo data - Room 305, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["10:00", "10:30", "14:00", "14:30"])
  },
  {
    key: taggedKey("doctor-vikram-singh"),
    name: "[Demo data] Dr. Vikram Singh",
    email: "demo.vet.vikram@medflow.local",
    speciality: "Veterinary Cardiology",
    degree: "BVSc & AH, MVSc Cardiology",
    experience: "15 Years",
    about: "Demo data - fictional veterinary cardiologist for local workflows.",
    fees: 900,
    address: {
      line1: "Demo data - Room 402, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["09:00", "09:30", "13:00", "13:30"])
  },
  {
    key: taggedKey("doctor-ananya-iyer"),
    name: "[Demo data] Dr. Ananya Iyer",
    email: "demo.vet.ananya@medflow.local",
    speciality: "Veterinary Orthopedics",
    degree: "BVSc & AH, MS Orthopedics",
    experience: "9 Years",
    about: "Demo data - fictional veterinary orthopedist for local workflows.",
    fees: 850,
    address: {
      line1: "Demo data - Room 210, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["12:00", "12:30", "17:00", "17:30"])
  },
  {
    key: taggedKey("doctor-rohan-gupta"),
    name: "[Demo data] Dr. Rohan Gupta",
    email: "demo.vet.rohan@medflow.local",
    speciality: "Veterinary Dentistry",
    degree: "BVSc & AH, MVSc Dentistry",
    experience: "7 Years",
    about: "Demo data - fictional veterinary dentist for local workflows.",
    fees: 650,
    address: {
      line1: "Demo data - Room 115, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["10:30", "11:00", "15:30", "16:00"])
  },
  {
    key: taggedKey("doctor-kavya-menon"),
    name: "[Demo data] Dr. Kavya Menon",
    email: "demo.vet.kavya@medflow.local",
    speciality: "Veterinary Ophthalmology",
    degree: "BVSc & AH, MVSc Ophthalmology",
    experience: "11 Years",
    about: "Demo data - fictional veterinary ophthalmologist for local workflows.",
    fees: 750,
    address: {
      line1: "Demo data - Room 320, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["09:30", "10:00", "14:30", "15:00"])
  },
  {
    key: taggedKey("doctor-aditya-kumar"),
    name: "[Demo data] Dr. Aditya Kumar",
    email: "demo.vet.aditya@medflow.local",
    speciality: "Veterinary Neurology",
    degree: "BVSc & AH, MVSc Neurology",
    experience: "13 Years",
    about: "Demo data - fictional veterinary neurologist for local workflows.",
    fees: 950,
    address: {
      line1: "Demo data - Room 410, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["11:30", "12:00", "16:30", "17:00"])
  },
  {
    key: taggedKey("doctor-sneha-patel"),
    name: "[Demo data] Dr. Sneha Patel",
    email: "demo.vet.sneha@medflow.local",
    speciality: "Veterinary Oncology",
    degree: "BVSc & AH, MVSc Oncology",
    experience: "10 Years",
    about: "Demo data - fictional veterinary oncologist for local workflows.",
    fees: 1000,
    address: {
      line1: "Demo data - Room 505, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["09:00", "09:30", "13:30", "14:00"])
  },
  {
    key: taggedKey("doctor-rahul-verma"),
    name: "[Demo data] Dr. Rahul Verma",
    email: "demo.vet.rahul@medflow.local",
    speciality: "Veterinary Internal Medicine",
    degree: "BVSc & AH, MVSc Internal Medicine",
    experience: "14 Years",
    about: "Demo data - fictional veterinary internist for local workflows.",
    fees: 880,
    address: {
      line1: "Demo data - Room 220, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["10:00", "10:30", "15:00", "15:30"])
  },
  {
    key: taggedKey("doctor-divya-sharma"),
    name: "[Demo data] Dr. Divya Sharma",
    email: "demo.vet.divya@medflow.local",
    speciality: "Emergency & Critical Care",
    degree: "BVSc & AH, MVSc Emergency Medicine",
    experience: "6 Years",
    about: "Demo data - fictional emergency veterinarian for local workflows.",
    fees: 1100,
    address: {
      line1: "Demo data - Emergency Wing, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["08:00", "08:30", "20:00", "20:30"])
  },
  {
    key: taggedKey("doctor-nikhil-joshi"),
    name: "[Demo data] Dr. Nikhil Joshi",
    email: "demo.vet.nikhil@medflow.local",
    speciality: "Exotic Animal Medicine",
    degree: "BVSc & AH, MVSc Exotic Medicine",
    experience: "8 Years",
    about: "Demo data - fictional exotic animal veterinarian for local workflows.",
    fees: 720,
    address: {
      line1: "Demo data - Room 130, MedFlow Vet Clinic",
      line2: "Fictional Veterinary District"
    },
    availability: weekdayAvailability(["11:00", "11:30", "16:00", "16:30"])
  }
];

const veterinarians: VeterinarianSeed[] = [
  {
    key: taggedKey("veterinarian-meera-rao"),
    doctorKey: taggedKey("doctor-meera-rao"),
    specialization: ["General Medicine", "Preventive Care"],
    clinicName: "MedFlow Vet Clinic - Main",
    yearsOfExperience: 12,
    licenseNumber: "VET-DEMO-1001",
    consultationFee: 600
  },
  {
    key: taggedKey("veterinarian-arjun-sen"),
    doctorKey: taggedKey("doctor-arjun-sen"),
    specialization: ["Surgery", "Orthopedics"],
    clinicName: "MedFlow Vet Clinic - Surgical",
    yearsOfExperience: 10,
    licenseNumber: "VET-DEMO-1002",
    consultationFee: 800
  },
  {
    key: taggedKey("veterinarian-priya-nair"),
    doctorKey: taggedKey("doctor-priya-nair"),
    specialization: ["Dermatology", "Allergy Management"],
    clinicName: "MedFlow Vet Clinic - Skin Care",
    yearsOfExperience: 8,
    licenseNumber: "VET-DEMO-1003",
    consultationFee: 700
  },
  {
    key: taggedKey("veterinarian-vikram-singh"),
    doctorKey: taggedKey("doctor-vikram-singh"),
    specialization: ["Cardiology", "Internal Medicine"],
    clinicName: "MedFlow Vet Clinic - Heart Care",
    yearsOfExperience: 15,
    licenseNumber: "VET-DEMO-1004",
    consultationFee: 900
  },
  {
    key: taggedKey("veterinarian-ananya-iyer"),
    doctorKey: taggedKey("doctor-ananya-iyer"),
    specialization: ["Orthopedics", "Rehabilitation"],
    clinicName: "MedFlow Vet Clinic - Bone & Joint",
    yearsOfExperience: 9,
    licenseNumber: "VET-DEMO-1005",
    consultationFee: 850
  },
  {
    key: taggedKey("veterinarian-rohan-gupta"),
    doctorKey: taggedKey("doctor-rohan-gupta"),
    specialization: ["Dentistry", "Oral Surgery"],
    clinicName: "MedFlow Vet Clinic - Dental",
    yearsOfExperience: 7,
    licenseNumber: "VET-DEMO-1006",
    consultationFee: 650
  },
  {
    key: taggedKey("veterinarian-kavya-menon"),
    doctorKey: taggedKey("doctor-kavya-menon"),
    specialization: ["Ophthalmology", "Vision Care"],
    clinicName: "MedFlow Vet Clinic - Eye Care",
    yearsOfExperience: 11,
    licenseNumber: "VET-DEMO-1007",
    consultationFee: 750
  },
  {
    key: taggedKey("veterinarian-aditya-kumar"),
    doctorKey: taggedKey("doctor-aditya-kumar"),
    specialization: ["Neurology", "Neurosurgery"],
    clinicName: "MedFlow Vet Clinic - Neuro",
    yearsOfExperience: 13,
    licenseNumber: "VET-DEMO-1008",
    consultationFee: 950
  },
  {
    key: taggedKey("veterinarian-sneha-patel"),
    doctorKey: taggedKey("doctor-sneha-patel"),
    specialization: ["Oncology", "Chemotherapy"],
    clinicName: "MedFlow Vet Clinic - Cancer Care",
    yearsOfExperience: 10,
    licenseNumber: "VET-DEMO-1009",
    consultationFee: 1000
  },
  {
    key: taggedKey("veterinarian-rahul-verma"),
    doctorKey: taggedKey("doctor-rahul-verma"),
    specialization: ["Internal Medicine", "Gastroenterology"],
    clinicName: "MedFlow Vet Clinic - Internal",
    yearsOfExperience: 14,
    licenseNumber: "VET-DEMO-1010",
    consultationFee: 880
  },
  {
    key: taggedKey("veterinarian-divya-sharma"),
    doctorKey: taggedKey("doctor-divya-sharma"),
    specialization: ["Emergency Care", "Critical Care"],
    clinicName: "MedFlow Vet Clinic - Emergency",
    yearsOfExperience: 6,
    licenseNumber: "VET-DEMO-1011",
    consultationFee: 1100
  },
  {
    key: taggedKey("veterinarian-nikhil-joshi"),
    doctorKey: taggedKey("doctor-nikhil-joshi"),
    specialization: ["Exotic Animals", "Avian Medicine"],
    clinicName: "MedFlow Vet Clinic - Exotic",
    yearsOfExperience: 8,
    licenseNumber: "VET-DEMO-1012",
    consultationFee: 720
  }
];

const owners: OwnerSeed[] = [
  {
    key: taggedKey("owner-ava-sharma"),
    name: "[Demo data] Ava Sharma",
    email: "demo.owner.ava@medflow.local",
    phone: "9000001001",
    gender: "Female",
    dob: "1992-04-18",
    address: {
      line1: "Demo data - Apartment 4B, Maple Residency",
      line2: "Fictional Locality, Bengaluru"
    },
    emergencyContact: "[Demo data] Nisha Sharma",
    emergencyPhone: "9000001002"
  },
  {
    key: taggedKey("owner-rahul-menon"),
    name: "[Demo data] Rahul Menon",
    email: "demo.owner.rahul@medflow.local",
    phone: "9000002001",
    gender: "Male",
    dob: "1985-09-07",
    address: {
      line1: "Demo data - House 12, River View Street",
      line2: "Fictional Locality, Kochi"
    },
    emergencyContact: "[Demo data] Leela Menon",
    emergencyPhone: "9000002002"
  },
  {
    key: taggedKey("owner-mira-das"),
    name: "[Demo data] Mira Das",
    email: "demo.owner.mira@medflow.local",
    phone: "9000003001",
    gender: "Female",
    dob: "2017-11-22",
    address: {
      line1: "Demo data - Flat 203, Garden View",
      line2: "Fictional Locality, Pune"
    },
    emergencyContact: "[Demo data] Anika Das",
    emergencyPhone: "9000003002"
  },
  {
    key: taggedKey("owner-arjun-patel"),
    name: "[Demo data] Arjun Patel",
    email: "demo.owner.arjun@medflow.local",
    phone: "9000004001",
    gender: "Male",
    dob: "1988-03-15",
    address: {
      line1: "Demo data - Villa 7, Palm Grove",
      line2: "Fictional Locality, Ahmedabad"
    },
    emergencyContact: "[Demo data] Kavita Patel",
    emergencyPhone: "9000004002"
  },
  {
    key: taggedKey("owner-sara-khan"),
    name: "[Demo data] Sara Khan",
    email: "demo.owner.sara@medflow.local",
    phone: "9000005001",
    gender: "Female",
    dob: "1995-07-29",
    address: {
      line1: "Demo data - House 45, Rose Lane",
      line2: "Fictional Locality, Hyderabad"
    },
    emergencyContact: "[Demo data] Imran Khan",
    emergencyPhone: "9000005002"
  },
  {
    key: taggedKey("owner-david-thomas"),
    name: "[Demo data] David Thomas",
    email: "demo.owner.david@medflow.local",
    phone: "9000006001",
    gender: "Male",
    dob: "1980-12-05",
    address: {
      line1: "Demo data - Bungalow 3, Lake View",
      line2: "Fictional Locality, Chennai"
    },
    emergencyContact: "[Demo data] Mary Thomas",
    emergencyPhone: "9000006002"
  }
];

const pets: PetSeed[] = [
  {
    key: taggedKey("pet-bella"),
    ownerKey: taggedKey("owner-ava-sharma"),
    name: "Bella",
    species: "Dog",
    breed: "Labrador Retriever",
    gender: "Female",
    age: 4,
    weight: 28.5,
    color: "Golden",
    dateOfBirth: "2022-03-10",
    microchipNumber: "DEMO-MICRO-1001",
    vaccinationStatus: "up-to-date",
    allergies: ["Chicken"],
    medicalHistory: ["Demo data - routine checkups", "Demo data - ear infection treated 2023"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-max"),
    ownerKey: taggedKey("owner-ava-sharma"),
    name: "Max",
    species: "Dog",
    breed: "German Shepherd",
    gender: "Male",
    age: 6,
    weight: 35.2,
    color: "Black & Tan",
    dateOfBirth: "2020-01-22",
    microchipNumber: "DEMO-MICRO-1002",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - hip dysplasia monitoring"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-whiskers"),
    ownerKey: taggedKey("owner-ava-sharma"),
    name: "Whiskers",
    species: "Cat",
    breed: "Persian",
    gender: "Male",
    age: 3,
    weight: 4.8,
    color: "White",
    dateOfBirth: "2023-05-15",
    microchipNumber: "DEMO-MICRO-1003",
    vaccinationStatus: "up-to-date",
    allergies: ["Fish"],
    medicalHistory: ["Demo data - hairball management"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-luna"),
    ownerKey: taggedKey("owner-rahul-menon"),
    name: "Luna",
    species: "Dog",
    breed: "Beagle",
    gender: "Female",
    age: 2,
    weight: 12.3,
    color: "Tricolor",
    dateOfBirth: "2024-02-08",
    microchipNumber: "DEMO-MICRO-1004",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - puppy vaccinations"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-simba"),
    ownerKey: taggedKey("owner-rahul-menon"),
    name: "Simba",
    species: "Cat",
    breed: "Maine Coon",
    gender: "Male",
    age: 5,
    weight: 7.1,
    color: "Brown Tabby",
    dateOfBirth: "2021-08-30",
    microchipNumber: "DEMO-MICRO-1005",
    vaccinationStatus: "overdue",
    allergies: [],
    medicalHistory: ["Demo data - dental cleaning 2024"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-coco"),
    ownerKey: taggedKey("owner-rahul-menon"),
    name: "Coco",
    species: "Rabbit",
    breed: "Holland Lop",
    gender: "Female",
    age: 1,
    weight: 1.8,
    color: "Grey",
    dateOfBirth: "2025-01-12",
    microchipNumber: "DEMO-MICRO-1006",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - routine wellness"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-rocky"),
    ownerKey: taggedKey("owner-mira-das"),
    name: "Rocky",
    species: "Dog",
    breed: "Golden Retriever",
    gender: "Male",
    age: 3,
    weight: 30.0,
    color: "Cream",
    dateOfBirth: "2023-04-25",
    microchipNumber: "DEMO-MICRO-1007",
    vaccinationStatus: "up-to-date",
    allergies: ["Beef"],
    medicalHistory: ["Demo data - skin allergy treatment"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-milo"),
    ownerKey: taggedKey("owner-mira-das"),
    name: "Milo",
    species: "Cat",
    breed: "Siamese",
    gender: "Male",
    age: 2,
    weight: 4.2,
    color: "Cream Point",
    dateOfBirth: "2024-06-18",
    microchipNumber: "DEMO-MICRO-1008",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - routine vaccinations"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-tweety"),
    ownerKey: taggedKey("owner-mira-das"),
    name: "Tweety",
    species: "Bird",
    breed: "Budgerigar",
    gender: "Female",
    age: 1,
    weight: 0.04,
    color: "Yellow",
    dateOfBirth: "2025-03-01",
    microchipNumber: "DEMO-MICRO-1009",
    vaccinationStatus: "not-applicable",
    allergies: [],
    medicalHistory: ["Demo data - wing clipping"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-bruno"),
    ownerKey: taggedKey("owner-arjun-patel"),
    name: "Bruno",
    species: "Dog",
    breed: "Boxer",
    gender: "Male",
    age: 4,
    weight: 27.8,
    color: "Fawn",
    dateOfBirth: "2022-07-14",
    microchipNumber: "DEMO-MICRO-1010",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - ACL surgery 2024"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-oreo"),
    ownerKey: taggedKey("owner-arjun-patel"),
    name: "Oreo",
    species: "Cat",
    breed: "British Shorthair",
    gender: "Female",
    age: 3,
    weight: 5.0,
    color: "Black & White",
    dateOfBirth: "2023-02-20",
    microchipNumber: "DEMO-MICRO-1011",
    vaccinationStatus: "up-to-date",
    allergies: ["Dairy"],
    medicalHistory: ["Demo data - urinary tract infection 2024"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-hammy"),
    ownerKey: taggedKey("owner-arjun-patel"),
    name: "Hammy",
    species: "Hamster",
    breed: "Syrian",
    gender: "Male",
    age: 1,
    weight: 0.12,
    color: "Golden",
    dateOfBirth: "2025-05-10",
    microchipNumber: "DEMO-MICRO-1012",
    vaccinationStatus: "not-applicable",
    allergies: [],
    medicalHistory: ["Demo data - routine wellness"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-zeus"),
    ownerKey: taggedKey("owner-sara-khan"),
    name: "Zeus",
    species: "Dog",
    breed: "Rottweiler",
    gender: "Male",
    age: 5,
    weight: 45.0,
    color: "Black & Mahogany",
    dateOfBirth: "2021-09-05",
    microchipNumber: "DEMO-MICRO-1013",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - hip evaluation"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-lily"),
    ownerKey: taggedKey("owner-sara-khan"),
    name: "Lily",
    species: "Cat",
    breed: "Ragdoll",
    gender: "Female",
    age: 2,
    weight: 4.5,
    color: "Seal Point",
    dateOfBirth: "2024-01-15",
    microchipNumber: "DEMO-MICRO-1014",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - routine wellness"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-mochi"),
    ownerKey: taggedKey("owner-sara-khan"),
    name: "Mochi",
    species: "Dog",
    breed: "Pomeranian",
    gender: "Female",
    age: 1,
    weight: 3.2,
    color: "Orange",
    dateOfBirth: "2025-02-14",
    microchipNumber: "DEMO-MICRO-1015",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - puppy vaccinations"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-ginger"),
    ownerKey: taggedKey("owner-sara-khan"),
    name: "Ginger",
    species: "Cat",
    breed: "Bengal",
    gender: "Female",
    age: 4,
    weight: 5.5,
    color: "Spotted Brown",
    dateOfBirth: "2022-10-01",
    microchipNumber: "DEMO-MICRO-1016",
    vaccinationStatus: "up-to-date",
    allergies: ["Seafood"],
    medicalHistory: ["Demo data - dental cleaning 2025"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-tommy"),
    ownerKey: taggedKey("owner-david-thomas"),
    name: "Tommy",
    species: "Dog",
    breed: "Cocker Spaniel",
    gender: "Male",
    age: 7,
    weight: 14.0,
    color: "Black",
    dateOfBirth: "2019-06-20",
    microchipNumber: "DEMO-MICRO-1017",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - ear infection 2024", "Demo data - arthritis management"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-misty"),
    ownerKey: taggedKey("owner-david-thomas"),
    name: "Misty",
    species: "Cat",
    breed: "Russian Blue",
    gender: "Female",
    age: 3,
    weight: 4.0,
    color: "Blue-Grey",
    dateOfBirth: "2023-08-12",
    microchipNumber: "DEMO-MICRO-1018",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - routine wellness"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-pepper"),
    ownerKey: taggedKey("owner-david-thomas"),
    name: "Pepper",
    species: "Dog",
    breed: "Dachshund",
    gender: "Male",
    age: 5,
    weight: 9.5,
    color: "Black & Tan",
    dateOfBirth: "2021-04-03",
    microchipNumber: "DEMO-MICRO-1019",
    vaccinationStatus: "overdue",
    allergies: ["Corn"],
    medicalHistory: ["Demo data - back pain management"],
    profileImage: ""
  },
  {
    key: taggedKey("pet-snowy"),
    ownerKey: taggedKey("owner-david-thomas"),
    name: "Snowy",
    species: "Rabbit",
    breed: "Netherland Dwarf",
    gender: "Female",
    age: 2,
    weight: 1.1,
    color: "White",
    dateOfBirth: "2024-07-25",
    microchipNumber: "DEMO-MICRO-1020",
    vaccinationStatus: "up-to-date",
    allergies: [],
    medicalHistory: ["Demo data - routine wellness"],
    profileImage: ""
  }
];

const vaccinations: VaccinationSeed[] = [
  {
    key: taggedKey("vaccination-bella-rabies"),
    petKey: taggedKey("pet-bella"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(30),
    completedDate: pastDate(30),
    nextDose: futureDate(335),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - annual rabies booster administered."
  },
  {
    key: taggedKey("vaccination-bella-dhpp"),
    petKey: taggedKey("pet-bella"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(60),
    completedDate: pastDate(60),
    nextDose: futureDate(305),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - combination vaccine booster."
  },
  {
    key: taggedKey("vaccination-max-rabies"),
    petKey: taggedKey("pet-max"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(15),
    completedDate: pastDate(15),
    nextDose: futureDate(350),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - annual rabies booster administered."
  },
  {
    key: taggedKey("vaccination-whiskers-fvrcp"),
    petKey: taggedKey("pet-whiskers"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(45),
    completedDate: pastDate(45),
    nextDose: futureDate(320),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  },
  {
    key: taggedKey("vaccination-whiskers-rabies"),
    petKey: taggedKey("pet-whiskers"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(45),
    completedDate: pastDate(45),
    nextDose: futureDate(320),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline rabies vaccine."
  },
  {
    key: taggedKey("vaccination-luna-dhpp"),
    petKey: taggedKey("pet-luna"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(20),
    completedDate: pastDate(20),
    nextDose: futureDate(345),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - puppy combination vaccine."
  },
  {
    key: taggedKey("vaccination-luna-rabies"),
    petKey: taggedKey("pet-luna"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(20),
    completedDate: pastDate(20),
    nextDose: futureDate(345),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - puppy rabies vaccine."
  },
  {
    key: taggedKey("vaccination-simba-fvrcp"),
    petKey: taggedKey("pet-simba"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(90),
    completedDate: pastDate(90),
    nextDose: futureDate(275),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  },
  {
    key: taggedKey("vaccination-simba-rabies"),
    petKey: taggedKey("pet-simba"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(90),
    completedDate: pastDate(90),
    nextDose: futureDate(275),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline rabies vaccine."
  },
  {
    key: taggedKey("vaccination-coco-rhd"),
    petKey: taggedKey("pet-coco"),
    vaccineName: "RHD (Rabbit Hemorrhagic Disease)",
    dueDate: pastDate(10),
    completedDate: pastDate(10),
    nextDose: futureDate(355),
    veterinarianKey: taggedKey("veterinarian-nikhil-joshi"),
    notes: "Demo data - rabbit viral hemorrhagic disease vaccine."
  },
  {
    key: taggedKey("vaccination-rocky-dhpp"),
    petKey: taggedKey("pet-rocky"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(25),
    completedDate: pastDate(25),
    nextDose: futureDate(340),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - combination vaccine booster."
  },
  {
    key: taggedKey("vaccination-rocky-rabies"),
    petKey: taggedKey("pet-rocky"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(25),
    completedDate: pastDate(25),
    nextDose: futureDate(340),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - annual rabies booster."
  },
  {
    key: taggedKey("vaccination-milo-fvrcp"),
    petKey: taggedKey("pet-milo"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(40),
    completedDate: pastDate(40),
    nextDose: futureDate(325),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  },
  {
    key: taggedKey("vaccination-bruno-dhpp"),
    petKey: taggedKey("pet-bruno"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(55),
    completedDate: pastDate(55),
    nextDose: futureDate(310),
    veterinarianKey: taggedKey("veterinarian-arjun-sen"),
    notes: "Demo data - combination vaccine booster."
  },
  {
    key: taggedKey("vaccination-bruno-rabies"),
    petKey: taggedKey("pet-bruno"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(55),
    completedDate: pastDate(55),
    nextDose: futureDate(310),
    veterinarianKey: taggedKey("veterinarian-arjun-sen"),
    notes: "Demo data - annual rabies booster."
  },
  {
    key: taggedKey("vaccination-oreo-fvrcp"),
    petKey: taggedKey("pet-oreo"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(70),
    completedDate: pastDate(70),
    nextDose: futureDate(295),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  },
  {
    key: taggedKey("vaccination-zeus-dhpp"),
    petKey: taggedKey("pet-zeus"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(35),
    completedDate: pastDate(35),
    nextDose: futureDate(330),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - combination vaccine booster."
  },
  {
    key: taggedKey("vaccination-zeus-rabies"),
    petKey: taggedKey("pet-zeus"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(35),
    completedDate: pastDate(35),
    nextDose: futureDate(330),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - annual rabies booster."
  },
  {
    key: taggedKey("vaccination-lily-fvrcp"),
    petKey: taggedKey("pet-lily"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(50),
    completedDate: pastDate(50),
    nextDose: futureDate(315),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  },
  {
    key: taggedKey("vaccination-lily-rabies"),
    petKey: taggedKey("pet-lily"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(50),
    completedDate: pastDate(50),
    nextDose: futureDate(315),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline rabies vaccine."
  },
  {
    key: taggedKey("vaccination-mochi-dhpp"),
    petKey: taggedKey("pet-mochi"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(5),
    completedDate: pastDate(5),
    nextDose: futureDate(360),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - puppy combination vaccine."
  },
  {
    key: taggedKey("vaccination-ginger-fvrcp"),
    petKey: taggedKey("pet-ginger"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(80),
    completedDate: pastDate(80),
    nextDose: futureDate(285),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  },
  {
    key: taggedKey("vaccination-tommy-dhpp"),
    petKey: taggedKey("pet-tommy"),
    vaccineName: "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
    dueDate: pastDate(100),
    completedDate: pastDate(100),
    nextDose: futureDate(265),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - combination vaccine booster."
  },
  {
    key: taggedKey("vaccination-tommy-rabies"),
    petKey: taggedKey("pet-tommy"),
    vaccineName: "Rabies Vaccine",
    dueDate: pastDate(100),
    completedDate: pastDate(100),
    nextDose: futureDate(265),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    notes: "Demo data - annual rabies booster."
  },
  {
    key: taggedKey("vaccination-misty-fvrcp"),
    petKey: taggedKey("pet-misty"),
    vaccineName: "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    dueDate: pastDate(65),
    completedDate: pastDate(65),
    nextDose: futureDate(300),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    notes: "Demo data - feline combination vaccine."
  }
];

const medicalRecords: MedicalRecordSeed[] = [
  {
    key: taggedKey("record-bella-ear-infection"),
    petKey: taggedKey("pet-bella"),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    diagnosis: "Otitis externa (ear infection)",
    symptoms: ["Head shaking", "Ear scratching", "Redness in ear canal"],
    medications: [
      {
        name: "Otomax Otic Suspension",
        dosage: "0.5 ml",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "Apply into affected ear after cleaning."
      }
    ],
    prescriptions: [
      {
        medicationName: "Otomax Otic Suspension",
        dosage: "0.5 ml",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "Apply into affected ear after cleaning."
      }
    ],
    treatment: "Ear cleaning under sedation, topical antibiotic-steroid suspension prescribed.",
    laboratoryReports: [
      {
        title: "Ear Swab Cytology",
        reportType: "Cytology",
        result: "Yeast organisms and cocci bacteria present."
      }
    ],
    attachments: [],
    visitDate: pastDate(120),
    followUpDate: pastDate(113)
  },
  {
    key: taggedKey("record-bella-routine-checkup"),
    petKey: taggedKey("pet-bella"),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    diagnosis: "Routine wellness examination",
    symptoms: ["None - routine checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Full physical examination, dental check, weight assessment. All parameters normal.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(30),
    followUpDate: futureDate(335)
  },
  {
    key: taggedKey("record-max-hip-dysplasia"),
    petKey: taggedKey("pet-max"),
    veterinarianKey: taggedKey("veterinarian-ananya-iyer"),
    diagnosis: "Hip dysplasia - moderate",
    symptoms: ["Difficulty rising", "Reduced activity", "Hind limb lameness"],
    medications: [
      {
        name: "Carprofen",
        dosage: "50 mg",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Give with food."
      },
      {
        name: "Glucosamine/Chondroitin",
        dosage: "500 mg",
        frequency: "Once daily",
        duration: "Ongoing",
        instructions: "Joint supplement for long-term management."
      }
    ],
    prescriptions: [
      {
        medicationName: "Carprofen",
        dosage: "50 mg",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Give with food."
      }
    ],
    treatment: "Radiographs confirmed moderate hip dysplasia. NSAID therapy and joint supplements initiated. Physical therapy recommended.",
    laboratoryReports: [
      {
        title: "Hip Radiographs",
        reportType: "Radiology",
        result: "Moderate bilateral hip dysplasia with mild degenerative changes."
      }
    ],
    attachments: [],
    visitDate: pastDate(200),
    followUpDate: pastDate(170)
  },
  {
    key: taggedKey("record-whiskers-hairball"),
    petKey: taggedKey("pet-whiskers"),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    diagnosis: "Trichobezoar (hairball) - mild",
    symptoms: ["Coughing", "Reduced appetite", "Lethargy"],
    medications: [
      {
        name: "Laxatone Hairball Gel",
        dosage: "2.5 cm",
        frequency: "Once daily",
        duration: "5 days",
        instructions: "Administer orally."
      }
    ],
    prescriptions: [
      {
        medicationName: "Laxatone Hairball Gel",
        dosage: "2.5 cm",
        frequency: "Once daily",
        duration: "5 days",
        instructions: "Administer orally."
      }
    ],
    treatment: "Hairball lubricant prescribed. Dietary fiber increase recommended. Monitor for resolution.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(75),
    followUpDate: pastDate(68)
  },
  {
    key: taggedKey("record-luna-puppy-checkup"),
    petKey: taggedKey("pet-luna"),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    diagnosis: "Puppy wellness visit",
    symptoms: ["None - routine puppy checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Vaccination administered, deworming completed, growth assessment normal.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(20),
    followUpDate: futureDate(345)
  },
  {
    key: taggedKey("record-simba-dental"),
    petKey: taggedKey("pet-simba"),
    veterinarianKey: taggedKey("veterinarian-rohan-gupta"),
    diagnosis: "Dental calculus and gingivitis",
    symptoms: ["Bad breath", "Tartar buildup", "Mild gum inflammation"],
    medications: [
      {
        name: "Clindamycin",
        dosage: "25 mg",
        frequency: "Twice daily",
        duration: "10 days",
        instructions: "Give with food."
      }
    ],
    prescriptions: [
      {
        medicationName: "Clindamycin",
        dosage: "25 mg",
        frequency: "Twice daily",
        duration: "10 days",
        instructions: "Give with food."
      }
    ],
    treatment: "Dental scaling and polishing under anesthesia. Antibiotic course prescribed. Dental diet recommended.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(150),
    followUpDate: pastDate(140)
  },
  {
    key: taggedKey("record-coco-wellness"),
    petKey: taggedKey("pet-coco"),
    veterinarianKey: taggedKey("veterinarian-nikhil-joshi"),
    diagnosis: "Routine wellness examination",
    symptoms: ["None - routine checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Physical examination normal. Diet and housing recommendations provided.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(10),
    followUpDate: futureDate(355)
  },
  {
    key: taggedKey("record-rocky-skin-allergy"),
    petKey: taggedKey("pet-rocky"),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    diagnosis: "Atopic dermatitis (skin allergy)",
    symptoms: ["Itching", "Red skin patches", "Hair loss on flanks"],
    medications: [
      {
        name: "Apoquel",
        dosage: "16 mg",
        frequency: "Twice daily for 14 days, then once daily",
        duration: "30 days",
        instructions: "Give with or without food."
      },
      {
        name: "Omega-3 Fatty Acids",
        dosage: "1000 mg",
        frequency: "Once daily",
        duration: "Ongoing",
        instructions: "Skin and coat supplement."
      }
    ],
    prescriptions: [
      {
        medicationName: "Apoquel",
        dosage: "16 mg",
        frequency: "Twice daily for 14 days, then once daily",
        duration: "30 days",
        instructions: "Give with or without food."
      }
    ],
    treatment: "Allergy management with Apoquel and omega-3 supplements. Bathing with medicated shampoo recommended.",
    laboratoryReports: [
      {
        title: "Skin Scrape",
        reportType: "Dermatology",
        result: "No mites or fungal elements identified."
      }
    ],
    attachments: [],
    visitDate: pastDate(45),
    followUpDate: pastDate(15)
  },
  {
    key: taggedKey("record-milo-vaccination"),
    petKey: taggedKey("pet-milo"),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    diagnosis: "Routine vaccination visit",
    symptoms: ["None - routine vaccination"],
    medications: [],
    prescriptions: [],
    treatment: "FVRCP booster administered. No adverse reactions observed.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(40),
    followUpDate: futureDate(325)
  },
  {
    key: taggedKey("record-bruno-acl-surgery"),
    petKey: taggedKey("pet-bruno"),
    veterinarianKey: taggedKey("veterinarian-arjun-sen"),
    diagnosis: "Cranial cruciate ligament (CCL) rupture",
    symptoms: ["Sudden hind limb lameness", "Swelling around knee", "Pain on manipulation"],
    medications: [
      {
        name: "Meloxicam",
        dosage: "1.5 mg",
        frequency: "Once daily",
        duration: "14 days",
        instructions: "Give with food."
      },
      {
        name: "Tramadol",
        dosage: "50 mg",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "For post-operative pain."
      }
    ],
    prescriptions: [
      {
        medicationName: "Meloxicam",
        dosage: "1.5 mg",
        frequency: "Once daily",
        duration: "14 days",
        instructions: "Give with food."
      },
      {
        medicationName: "Tramadol",
        dosage: "50 mg",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "For post-operative pain."
      }
    ],
    treatment: "Tibial plateau leveling osteotomy (TPLO) surgery performed. Post-operative pain management and restricted activity for 8 weeks.",
    laboratoryReports: [
      {
        title: "Pre-operative Bloodwork",
        reportType: "Laboratory",
        result: "Within normal limits."
      },
      {
        title: "Stifle Radiographs",
        reportType: "Radiology",
        result: "Complete CCL rupture confirmed."
      }
    ],
    attachments: [],
    visitDate: pastDate(180),
    followUpDate: pastDate(124)
  },
  {
    key: taggedKey("record-oreo-uti"),
    petKey: taggedKey("pet-oreo"),
    veterinarianKey: taggedKey("veterinarian-rahul-verma"),
    diagnosis: "Feline lower urinary tract disease (FLUTD)",
    symptoms: ["Straining to urinate", "Blood in urine", "Frequent urination"],
    medications: [
      {
        name: "Amoxicillin-Clavulanate",
        dosage: "62.5 mg",
        frequency: "Twice daily",
        duration: "14 days",
        instructions: "Give with food."
      }
    ],
    prescriptions: [
      {
        medicationName: "Amoxicillin-Clavulanate",
        dosage: "62.5 mg",
        frequency: "Twice daily",
        duration: "14 days",
        instructions: "Give with food."
      }
    ],
    treatment: "Urinalysis confirmed urinary tract infection. Antibiotic course prescribed. Increased water intake and urinary diet recommended.",
    laboratoryReports: [
      {
        title: "Urinalysis",
        reportType: "Laboratory",
        result: "Bacteria present, elevated pH, trace blood."
      }
    ],
    attachments: [],
    visitDate: pastDate(90),
    followUpDate: pastDate(76)
  },
  {
    key: taggedKey("record-zeus-hip-eval"),
    petKey: taggedKey("pet-zeus"),
    veterinarianKey: taggedKey("veterinarian-ananya-iyer"),
    diagnosis: "Hip evaluation - mild dysplasia",
    symptoms: ["Mild stiffness after exercise", "Slight gait abnormality"],
    medications: [
      {
        name: "Glucosamine/Chondroitin",
        dosage: "1000 mg",
        frequency: "Once daily",
        duration: "Ongoing",
        instructions: "Joint supplement."
      }
    ],
    prescriptions: [],
    treatment: "Radiographs showed mild hip dysplasia. Joint supplements initiated. Weight management and low-impact exercise recommended.",
    laboratoryReports: [
      {
        title: "Hip Radiographs",
        reportType: "Radiology",
        result: "Mild bilateral hip dysplasia."
      }
    ],
    attachments: [],
    visitDate: pastDate(110),
    followUpDate: pastDate(80)
  },
  {
    key: taggedKey("record-lily-wellness"),
    petKey: taggedKey("pet-lily"),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    diagnosis: "Routine wellness examination",
    symptoms: ["None - routine checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Full physical examination normal. Vaccination status reviewed and updated.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(50),
    followUpDate: futureDate(315)
  },
  {
    key: taggedKey("record-mochi-puppy-checkup"),
    petKey: taggedKey("pet-mochi"),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    diagnosis: "Puppy wellness visit",
    symptoms: ["None - routine puppy checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Vaccination administered, deworming completed, growth assessment normal.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(5),
    followUpDate: futureDate(360)
  },
  {
    key: taggedKey("record-ginger-dental"),
    petKey: taggedKey("pet-ginger"),
    veterinarianKey: taggedKey("veterinarian-rohan-gupta"),
    diagnosis: "Dental calculus",
    symptoms: ["Tartar buildup", "Mild halitosis"],
    medications: [],
    prescriptions: [],
    treatment: "Dental scaling and polishing under anesthesia. Dental diet recommended.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(30),
    followUpDate: futureDate(335)
  },
  {
    key: taggedKey("record-tommy-arthritis"),
    petKey: taggedKey("pet-tommy"),
    veterinarianKey: taggedKey("veterinarian-rahul-verma"),
    diagnosis: "Osteoarthritis - chronic",
    symptoms: ["Stiffness", "Difficulty climbing stairs", "Reduced activity"],
    medications: [
      {
        name: "Galliprant",
        dosage: "20 mg",
        frequency: "Once daily",
        duration: "Ongoing",
        instructions: "Give with food."
      }
    ],
    prescriptions: [
      {
        medicationName: "Galliprant",
        dosage: "20 mg",
        frequency: "Once daily",
        duration: "Ongoing",
        instructions: "Give with food."
      }
    ],
    treatment: "Chronic arthritis management with Galliprant. Weight management, joint supplements, and physical therapy recommended.",
    laboratoryReports: [
      {
        title: "Joint Radiographs",
        reportType: "Radiology",
        result: "Moderate degenerative joint disease in both elbows."
      }
    ],
    attachments: [],
    visitDate: pastDate(60),
    followUpDate: pastDate(30)
  },
  {
    key: taggedKey("record-misty-wellness"),
    petKey: taggedKey("pet-misty"),
    veterinarianKey: taggedKey("veterinarian-priya-nair"),
    diagnosis: "Routine wellness examination",
    symptoms: ["None - routine checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Full physical examination normal. Vaccination status reviewed.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(65),
    followUpDate: futureDate(300)
  },
  {
    key: taggedKey("record-pepper-back-pain"),
    petKey: taggedKey("pet-pepper"),
    veterinarianKey: taggedKey("veterinarian-aditya-kumar"),
    diagnosis: "Intervertebral disc disease (IVDD) - mild",
    symptoms: ["Back pain", "Reluctance to jump", "Slight hind limb weakness"],
    medications: [
      {
        name: "Prednisone",
        dosage: "5 mg",
        frequency: "Twice daily for 5 days, then taper",
        duration: "14 days",
        instructions: "Give with food. Taper as directed."
      }
    ],
    prescriptions: [
      {
        medicationName: "Prednisone",
        dosage: "5 mg",
        frequency: "Twice daily for 5 days, then taper",
        duration: "14 days",
        instructions: "Give with food. Taper as directed."
      }
    ],
    treatment: "Strict cage rest for 2 weeks. Anti-inflammatory therapy initiated. Neurological assessment recommended at follow-up.",
    laboratoryReports: [
      {
        title: "Spinal Radiographs",
        reportType: "Radiology",
        result: "Mild narrowing at L1-L2 intervertebral space."
      }
    ],
    attachments: [],
    visitDate: pastDate(15),
    followUpDate: pastDate(1)
  },
  {
    key: taggedKey("record-snowy-wellness"),
    petKey: taggedKey("pet-snowy"),
    veterinarianKey: taggedKey("veterinarian-nikhil-joshi"),
    diagnosis: "Routine wellness examination",
    symptoms: ["None - routine checkup"],
    medications: [],
    prescriptions: [],
    treatment: "Physical examination normal. Diet and housing recommendations provided.",
    laboratoryReports: [],
    attachments: [],
    visitDate: pastDate(8),
    followUpDate: futureDate(357)
  },
  {
    key: taggedKey("record-tommy-ear-infection"),
    petKey: taggedKey("pet-tommy"),
    veterinarianKey: taggedKey("veterinarian-meera-rao"),
    diagnosis: "Chronic otitis externa",
    symptoms: ["Ear discharge", "Head shaking", "Ear odor"],
    medications: [
      {
        name: "Mometamax Otic Suspension",
        dosage: "1 ml",
        frequency: "Once daily",
        duration: "10 days",
        instructions: "Apply into affected ear after cleaning."
      }
    ],
    prescriptions: [
      {
        medicationName: "Mometamax Otic Suspension",
        dosage: "1 ml",
        frequency: "Once daily",
        duration: "10 days",
        instructions: "Apply into affected ear after cleaning."
      }
    ],
    treatment: "Ear flushing under sedation. Topical antibiotic-steroid-antifungal suspension prescribed. Recheck in 10 days.",
    laboratoryReports: [
      {
        title: "Ear Swab Culture",
        reportType: "Microbiology",
        result: "Pseudomonas aeruginosa growth - sensitive to gentamicin."
      }
    ],
    attachments: [],
    visitDate: pastDate(95),
    followUpDate: pastDate(85)
  }
];

const createDoctorIfMissing = async (
  seed: DoctorSeed,
  passwordHash: string,
  organizationId: string
): Promise<{ document: DoctorDocument; created: boolean }> => {
  const existingByKey = await DoctorModel.findOne({ demoSeedKey: seed.key });
  if (existingByKey) {
    return { document: existingByKey, created: false };
  }

  const normalizedEmail = normalizeEmail(seed.email);
  const existingByEmail = await DoctorModel.findOne({ normalizedEmail });
  if (existingByEmail) {
    throw new Error(
      `Refusing to seed ${seed.email}: an existing non-demo doctor account already uses this email.`
    );
  }

  const created = await new DoctorModel({
    name: seed.name,
    email: seed.email,
    normalizedEmail,
    password: passwordHash,
    image: DEFAULT_DOCTOR_IMAGE,
    speciality: seed.speciality,
    degree: seed.degree,
    experience: seed.experience,
    about: seed.about,
    available: true,
    fees: seed.fees,
    slots_booked: {},
    availability: seed.availability,
    address: seed.address,
    date: Date.now(),
    role: "DOCTOR",
    organizationId,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    authenticationProvider: "LOCAL",
    demoSeedKey: seed.key,
    demoDataLabel: DEMO_DATA_LABEL
  }).save();

  return { document: created, created: true };
};

const createOwnerIfMissing = async (
  seed: OwnerSeed,
  passwordHash: string,
  organizationId: string
): Promise<{ document: UserDocument; created: boolean }> => {
  const existingByKey = await UserModel.findOne({ demoSeedKey: seed.key });
  if (existingByKey) {
    return { document: existingByKey, created: false };
  }

  const normalizedEmail = normalizeEmail(seed.email);
  const existingByEmail = await UserModel.findOne({ normalizedEmail });
  if (existingByEmail) {
    throw new Error(
      `Refusing to seed ${seed.email}: an existing non-demo patient account already uses this email.`
    );
  }

  const created = await new UserModel({
    name: seed.name,
    email: seed.email,
    normalizedEmail,
    image: DEFAULT_USER_IMAGE,
    phone: seed.phone,
    address: seed.address,
    gender: seed.gender,
    dob: seed.dob,
    healthProfile: {
      bloodGroup: "Not known",
      allergies: [],
      chronicConditions: [],
      medicalNotes: "Demo data - fictional pet owner profile for local veterinary workflows.",
      emergencyContact: {
        name: seed.emergencyContact,
        relationship: "Emergency Contact",
        phone: seed.emergencyPhone
      },
      insurance: {
        provider: "",
        policyNumber: "",
        expiryDate: ""
      }
    },
    password: passwordHash,
    role: "PATIENT",
    organizationId,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    authenticationProvider: "LOCAL",
    demoSeedKey: seed.key,
    demoDataLabel: DEMO_DATA_LABEL
  }).save();

  return { document: created, created: true };
};

const ensureMembership = async ({
  accountId,
  accountType,
  role,
  organizationId
}: {
  accountId: string;
  accountType: AccountType;
  role: EnterpriseRole;
  organizationId: string;
}): Promise<boolean> => {
  const existing = await OrganizationMembershipModel.findOne({
    organizationId,
    accountId,
    accountType,
    status: "ACTIVE"
  });

  if (existing) {
    return false;
  }

  await new OrganizationMembershipModel({
    organizationId,
    accountId,
    accountType,
    role,
    scopedPermissions: [],
    status: "ACTIVE",
    activatedAt: new Date()
  }).save();

  return true;
};

const insertTaggedDocumentIfMissing = async (
  collectionName: string,
  demoSeedKey: string,
  document: Record<string, unknown>
): Promise<boolean> => {
  const collection = mongoose.connection.collection(collectionName);
  const existing = await collection.findOne({ demoSeedKey });
  if (existing) {
    return false;
  }

  const now = new Date();
  await collection.insertOne({
    ...document,
    demoSeedKey,
    demoDataLabel: DEMO_DATA_LABEL,
    createdAt: now,
    updatedAt: now
  });

  return true;
};

const run = async (): Promise<void> => {
  assertDemoSeedAllowed();
  await connectDB();

  const counters: SeedCounters = {
    doctorsCreated: 0,
    doctorsSkipped: 0,
    veterinariansCreated: 0,
    veterinariansSkipped: 0,
    ownersCreated: 0,
    ownersSkipped: 0,
    petsCreated: 0,
    petsSkipped: 0,
    vaccinationsCreated: 0,
    vaccinationsSkipped: 0,
    medicalRecordsCreated: 0,
    medicalRecordsSkipped: 0,
    membershipsCreated: 0,
    membershipsSkipped: 0
  };

  const organization = await getOrCreateDefaultOrganization();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const doctorMap = new Map<string, DoctorDocument>();
  const ownerMap = new Map<string, UserDocument>();

  for (const seed of doctors) {
    const { document, created } = await createDoctorIfMissing(seed, passwordHash, organization.id);
    doctorMap.set(seed.key, document);
    if (created) {
      counters.doctorsCreated += 1;
    } else {
      counters.doctorsSkipped += 1;
    }

    const membershipCreated = await ensureMembership({
      accountId: String(document._id),
      accountType: "doctor",
      role: "DOCTOR",
      organizationId: organization.id
    });
    if (membershipCreated) {
      counters.membershipsCreated += 1;
    } else {
      counters.membershipsSkipped += 1;
    }
  }

  for (const seed of owners) {
    const { document, created } = await createOwnerIfMissing(seed, passwordHash, organization.id);
    ownerMap.set(seed.key, document);
    if (created) {
      counters.ownersCreated += 1;
    } else {
      counters.ownersSkipped += 1;
    }

    const membershipCreated = await ensureMembership({
      accountId: String(document._id),
      accountType: "patient",
      role: "PATIENT",
      organizationId: organization.id
    });
    if (membershipCreated) {
      counters.membershipsCreated += 1;
    } else {
      counters.membershipsSkipped += 1;
    }
  }

  for (const seed of veterinarians) {
    const doctor = doctorMap.get(seed.doctorKey);
    if (!doctor) {
      throw new Error(`Veterinarian ${seed.key} references a missing demo doctor.`);
    }

    const created = await insertTaggedDocumentIfMissing("veterinarians", seed.key, {
      doctorId: doctor._id,
      specialization: seed.specialization,
      clinicName: seed.clinicName,
      yearsOfExperience: seed.yearsOfExperience,
      licenseNumber: seed.licenseNumber,
      consultationFee: seed.consultationFee,
      availability: {
        enabled: true,
        timezone: "Asia/Kolkata",
        consultationDurationMinutes: 30,
        weeklySchedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          slots: ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]
        }))
      }
    });
    if (created) {
      counters.veterinariansCreated += 1;
    } else {
      counters.veterinariansSkipped += 1;
    }
  }

  for (const seed of owners) {
    const owner = ownerMap.get(seed.key);
    if (!owner) {
      throw new Error(`Pet owner ${seed.key} references a missing demo user.`);
    }

    const created = await insertTaggedDocumentIfMissing("pet_owners", seed.key, {
      userId: owner._id,
      phone: seed.phone,
      address: seed.address,
      emergencyContact: seed.emergencyContact,
      emergencyPhone: seed.emergencyPhone
    });
    if (created) {
      counters.ownersCreated += 1;
    } else {
      counters.ownersSkipped += 1;
    }
  }

  const petMap = new Map<string, { _id: unknown }>();
  for (const seed of pets) {
    const owner = ownerMap.get(seed.ownerKey);
    if (!owner) {
      throw new Error(`Pet ${seed.key} references a missing demo owner.`);
    }

    const created = await insertTaggedDocumentIfMissing("pets", seed.key, {
      ownerId: owner._id,
      name: seed.name,
      species: seed.species,
      breed: seed.breed,
      gender: seed.gender,
      age: seed.age,
      weight: seed.weight,
      color: seed.color,
      dateOfBirth: new Date(`${seed.dateOfBirth}T00:00:00+05:30`),
      microchipNumber: seed.microchipNumber,
      vaccinationStatus: seed.vaccinationStatus,
      allergies: seed.allergies,
      medicalHistory: seed.medicalHistory,
      profileImage: seed.profileImage
    });
    if (created) {
      counters.petsCreated += 1;
    } else {
      counters.petsSkipped += 1;
    }

    const petDoc = await mongoose.connection
      .collection("pets")
      .findOne({ demoSeedKey: seed.key });
    if (petDoc) {
      petMap.set(seed.key, petDoc);
    }
  }

  const veterinarianMap = new Map<string, { _id: unknown }>();
  for (const seed of veterinarians) {
    const vetDoc = await mongoose.connection
      .collection("veterinarians")
      .findOne({ demoSeedKey: seed.key });
    if (vetDoc) {
      veterinarianMap.set(seed.key, vetDoc);
    }
  }

  for (const seed of vaccinations) {
    const pet = petMap.get(seed.petKey);
    if (!pet) {
      throw new Error(`Vaccination ${seed.key} references a missing demo pet.`);
    }

    const veterinarian = seed.veterinarianKey
      ? veterinarianMap.get(seed.veterinarianKey)
      : undefined;

    const created = await insertTaggedDocumentIfMissing("vaccinations", seed.key, {
      petId: pet._id,
      vaccineName: seed.vaccineName,
      dueDate: new Date(`${seed.dueDate}T00:00:00+05:30`),
      completedDate: seed.completedDate
        ? new Date(`${seed.completedDate}T00:00:00+05:30`)
        : undefined,
      nextDose: seed.nextDose ? new Date(`${seed.nextDose}T00:00:00+05:30`) : undefined,
      veterinarian: veterinarian?._id,
      notes: seed.notes
    });
    if (created) {
      counters.vaccinationsCreated += 1;
    } else {
      counters.vaccinationsSkipped += 1;
    }
  }

  for (const seed of medicalRecords) {
    const pet = petMap.get(seed.petKey);
    const veterinarian = veterinarianMap.get(seed.veterinarianKey);
    if (!pet || !veterinarian) {
      throw new Error(`Medical record ${seed.key} references a missing demo pet or veterinarian.`);
    }

    const created = await insertTaggedDocumentIfMissing("pet_medical_records", seed.key, {
      petId: pet._id,
      veterinarianId: veterinarian._id,
      diagnosis: seed.diagnosis,
      symptoms: seed.symptoms,
      medications: seed.medications,
      prescriptions: seed.prescriptions,
      treatment: seed.treatment,
      laboratoryReports: seed.laboratoryReports,
      attachments: seed.attachments,
      visitDate: new Date(`${seed.visitDate}T00:00:00+05:30`),
      followUpDate: seed.followUpDate
        ? new Date(`${seed.followUpDate}T00:00:00+05:30`)
        : undefined
    });
    if (created) {
      counters.medicalRecordsCreated += 1;
    } else {
      counters.medicalRecordsSkipped += 1;
    }
  }

  console.info("Veterinary local demo seed completed.", {
    organization: organization.name,
    label: DEMO_DATA_LABEL,
    demoSeedPrefix: DEMO_PREFIX,
    demoAccountEmails: [...doctors.map((seed) => seed.email), ...owners.map((seed) => seed.email)],
    demoPassword: DEMO_PASSWORD,
    ...counters
  });
  console.info(
    "No existing records were overwritten or deleted. Re-running this command skips tagged demo records."
  );
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Veterinary demo seed failed");
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDB().then(() => mongoose.connection.removeAllListeners());
  });
