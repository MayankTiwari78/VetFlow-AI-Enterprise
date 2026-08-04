import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/database.js";
import { env } from "../config/env.js";
import { DEFAULT_DOCTOR_IMAGE, DEFAULT_USER_IMAGE } from "../constants/defaults.js";
import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole } from "../constants/rbac.js";
import AppointmentModel, { type AppointmentDocument } from "../models/Appointment.js";
import DoctorModel, { type DoctorDocument } from "../models/Doctor.js";
import OrganizationMembershipModel from "../models/OrganizationMembership.js";
import UserModel, { type UserDocument } from "../models/User.js";
import { defaultDoctorAvailability } from "../services/availabilityService.js";
import { getOrCreateDefaultOrganization } from "../services/organizationService.js";
import type {
  Address,
  DoctorAvailability,
  DoctorSnapshot,
  PatientHealthProfile,
  UserProfileSnapshot
} from "../types/domain.js";
import { normalizeEmail } from "../utils/authCrypto.js";

const DEMO_PREFIX = "phase2c-demo:";
const DEMO_DATA_LABEL = "Demo data";
const DEMO_PASSWORD = "DemoData!2026";

interface SeedCounters {
  patientsCreated: number;
  patientsSkipped: number;
  doctorsCreated: number;
  doctorsSkipped: number;
  membershipsCreated: number;
  membershipsSkipped: number;
  appointmentsCreated: number;
  appointmentsSkipped: number;
  timelineRecordsCreated: number;
  timelineRecordsSkipped: number;
  familyMembersCreated: number;
  familyMembersSkipped: number;
}

interface PatientSeed {
  key: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  address: Address;
  healthProfile: PatientHealthProfile;
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

interface AppointmentSeed {
  key: string;
  patientKey: string;
  doctorKey: string;
  slotDate: string;
  slotTime: string;
  status: "scheduled" | "completed";
  payment: boolean;
  isCompleted: boolean;
  clinicalNotes: string;
}

const assertDemoSeedAllowed = (): void => {
  if (!env.isDevelopment || env.NODE_ENV !== "development") {
    throw new Error("Phase 2C demo seed is allowed only when NODE_ENV=development.");
  }

  if (process.env.ALLOW_PHASE2C_DEMO_SEED !== "true") {
    throw new Error(
      "Phase 2C demo seed is opt-in only. Set ALLOW_PHASE2C_DEMO_SEED=true for this command."
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

const upcomingDateForWeekday = (minimumDaysAhead: number, dayOfWeek: number): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + minimumDaysAhead);

  while (date.getDay() !== dayOfWeek) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().slice(0, 10);
};

const timestampFromSlot = (slotDate: string, slotTime: string): number =>
  new Date(`${slotDate}T${slotTime}:00+05:30`).getTime();

const weekdayAvailability = (slots: string[]): DoctorAvailability => ({
  ...defaultDoctorAvailability(),
  weeklySchedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, slots }))
});

const patients: PatientSeed[] = [
  {
    key: taggedKey("patient-ava-sharma"),
    name: "[Demo data] Ava Sharma",
    email: "demo.patient.ava@medflow.local",
    phone: "9000001001",
    gender: "Female",
    dob: "1992-04-18",
    address: {
      line1: "Demo data - Apartment 4B, Maple Residency",
      line2: "Fictional Locality, Bengaluru"
    },
    healthProfile: {
      bloodGroup: "B+",
      allergies: ["Demo data - penicillin sensitivity"],
      chronicConditions: ["Demo data - mild asthma"],
      medicalNotes: "Demo data - fictional patient profile for local Phase 2C workflows only.",
      emergencyContact: {
        name: "[Demo data] Nisha Sharma",
        relationship: "Sister",
        phone: "9000001002"
      },
      insurance: {
        provider: "Demo data - Care Sample Insurance",
        policyNumber: "DEMO-POL-1001",
        expiryDate: "2027-12-31"
      }
    }
  },
  {
    key: taggedKey("patient-rahul-menon"),
    name: "[Demo data] Rahul Menon",
    email: "demo.patient.rahul@medflow.local",
    phone: "9000002001",
    gender: "Male",
    dob: "1985-09-07",
    address: {
      line1: "Demo data - House 12, River View Street",
      line2: "Fictional Locality, Kochi"
    },
    healthProfile: {
      bloodGroup: "O+",
      allergies: [],
      chronicConditions: ["Demo data - hypertension"],
      medicalNotes: "Demo data - fictional patient profile for local Phase 2C workflows only.",
      emergencyContact: {
        name: "[Demo data] Leela Menon",
        relationship: "Mother",
        phone: "9000002002"
      },
      insurance: {
        provider: "Demo data - Sample Health Shield",
        policyNumber: "DEMO-POL-2001",
        expiryDate: "2028-03-31"
      }
    }
  },
  {
    key: taggedKey("patient-mira-das"),
    name: "[Demo data] Mira Das",
    email: "demo.patient.mira@medflow.local",
    phone: "9000003001",
    gender: "Female",
    dob: "2017-11-22",
    address: {
      line1: "Demo data - Flat 203, Garden View",
      line2: "Fictional Locality, Pune"
    },
    healthProfile: {
      bloodGroup: "A+",
      allergies: ["Demo data - peanut allergy"],
      chronicConditions: [],
      medicalNotes: "Demo data - fictional minor patient profile for family-member workflows only.",
      emergencyContact: {
        name: "[Demo data] Anika Das",
        relationship: "Mother",
        phone: "9000003002"
      },
      insurance: {
        provider: "Demo data - Family Sample Cover",
        policyNumber: "DEMO-POL-3001",
        expiryDate: "2027-09-30"
      }
    }
  }
];

const doctors: DoctorSeed[] = [
  {
    key: taggedKey("doctor-meera-rao"),
    name: "[Demo data] Dr. Meera Rao",
    email: "demo.doctor.meera@medflow.local",
    speciality: "General physician",
    degree: "MBBS, MD General Medicine",
    experience: "11 Years",
    about:
      "Demo data - fictional clinician used for local appointment and timeline demonstrations.",
    fees: 650,
    address: {
      line1: "Demo data - Room 201, MedFlow Demo Clinic",
      line2: "Fictional Medical District"
    },
    availability: weekdayAvailability(["09:30", "10:00", "10:30", "15:00", "15:30"])
  },
  {
    key: taggedKey("doctor-arjun-sen"),
    name: "[Demo data] Dr. Arjun Sen",
    email: "demo.doctor.arjun@medflow.local",
    speciality: "Pediatricians",
    degree: "MBBS, DCH",
    experience: "9 Years",
    about:
      "Demo data - fictional pediatric clinician used for local vaccination workflows.",
    fees: 700,
    address: {
      line1: "Demo data - Room 108, MedFlow Demo Clinic",
      line2: "Fictional Medical District"
    },
    availability: weekdayAvailability(["11:00", "11:30", "16:00", "16:30"])
  }
];

const appointmentSeeds: AppointmentSeed[] = [
  {
    key: taggedKey("appointment-ava-completed-checkup"),
    patientKey: taggedKey("patient-ava-sharma"),
    doctorKey: taggedKey("doctor-meera-rao"),
    slotDate: pastDate(42),
    slotTime: "10:00",
    status: "completed",
    payment: true,
    isCompleted: true,
    clinicalNotes:
      "[Demo data] Finalized consultation note: asthma symptoms stable; continue inhaler plan."
  },
  {
    key: taggedKey("appointment-rahul-completed-followup"),
    patientKey: taggedKey("patient-rahul-menon"),
    doctorKey: taggedKey("doctor-meera-rao"),
    slotDate: pastDate(18),
    slotTime: "15:00",
    status: "completed",
    payment: true,
    isCompleted: true,
    clinicalNotes:
      "[Demo data] Finalized follow-up note: blood pressure reviewed with lifestyle plan."
  },
  {
    key: taggedKey("appointment-mira-completed-vaccination"),
    patientKey: taggedKey("patient-mira-das"),
    doctorKey: taggedKey("doctor-arjun-sen"),
    slotDate: pastDate(9),
    slotTime: "11:00",
    status: "completed",
    payment: true,
    isCompleted: true,
    clinicalNotes:
      "[Demo data] Finalized vaccination note: routine pediatric vaccine administered."
  },
  {
    key: taggedKey("appointment-ava-upcoming-review"),
    patientKey: taggedKey("patient-ava-sharma"),
    doctorKey: taggedKey("doctor-meera-rao"),
    slotDate: upcomingDateForWeekday(7, 1),
    slotTime: "09:30",
    status: "scheduled",
    payment: false,
    isCompleted: false,
    clinicalNotes: "[Demo data] Upcoming review placeholder for local development only."
  },
  {
    key: taggedKey("appointment-mira-upcoming-pediatric"),
    patientKey: taggedKey("patient-mira-das"),
    doctorKey: taggedKey("doctor-arjun-sen"),
    slotDate: upcomingDateForWeekday(10, 3),
    slotTime: "16:00",
    status: "scheduled",
    payment: false,
    isCompleted: false,
    clinicalNotes: "[Demo data] Upcoming pediatric follow-up placeholder for local development only."
  }
];

const userSnapshot = (patient: UserDocument): UserProfileSnapshot => ({
  _id: String(patient._id),
  name: patient.name,
  email: patient.email,
  image: patient.image,
  phone: patient.phone,
  address: patient.address,
  gender: patient.gender,
  dob: patient.dob
});

const doctorSnapshot = (doctor: DoctorDocument): DoctorSnapshot => ({
  _id: String(doctor._id),
  name: doctor.name,
  email: doctor.email,
  image: doctor.image,
  speciality: doctor.speciality,
  degree: doctor.degree,
  experience: doctor.experience,
  about: doctor.about,
  available: doctor.available,
  fees: doctor.fees,
  address: doctor.address,
  date: doctor.date,
  slots_booked: doctor.slots_booked
});

const createPatientIfMissing = async (
  seed: PatientSeed,
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
    healthProfile: seed.healthProfile,
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

const createAppointmentIfMissing = async (
  seed: AppointmentSeed,
  patient: UserDocument,
  doctor: DoctorDocument,
  organizationId: string
): Promise<{ document?: AppointmentDocument; created: boolean }> => {
  const existing = await AppointmentModel.findOne({ demoSeedKey: seed.key }).select(
    "+clinicalNotes"
  );
  if (existing) {
    return { document: existing, created: false };
  }

  const created = await new AppointmentModel({
    userId: String(patient._id),
    docId: String(doctor._id),
    slotDate: seed.slotDate,
    slotTime: seed.slotTime,
    userData: userSnapshot(patient),
    docData: doctorSnapshot(doctor),
    amount: doctor.fees,
    date: timestampFromSlot(seed.slotDate, seed.slotTime),
    cancelled: false,
    payment: seed.payment,
    isCompleted: seed.isCompleted,
    status: seed.status,
    clinicalNotes: seed.clinicalNotes,
    clinicalNotesUpdatedAt: seed.isCompleted ? new Date() : undefined,
    organizationId,
    demoSeedKey: seed.key,
    demoDataLabel: DEMO_DATA_LABEL
  }).save();

  return { document: created, created: true };
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

const seedTimelineRecords = async ({
  patientMap,
  doctorMap,
  appointmentMap,
  organizationId,
  counters
}: {
  patientMap: Map<string, UserDocument>;
  doctorMap: Map<string, DoctorDocument>;
  appointmentMap: Map<string, AppointmentDocument>;
  organizationId: string;
  counters: SeedCounters;
}): Promise<void> => {
  const ava = patientMap.get(taggedKey("patient-ava-sharma"));
  const rahul = patientMap.get(taggedKey("patient-rahul-menon"));
  const mira = patientMap.get(taggedKey("patient-mira-das"));
  const meera = doctorMap.get(taggedKey("doctor-meera-rao"));
  const arjun = doctorMap.get(taggedKey("doctor-arjun-sen"));

  if (!ava || !rahul || !mira || !meera || !arjun) {
    throw new Error("Demo timeline dependencies were not created.");
  }

  const records = [
    {
      demoSeedKey: taggedKey("timeline-ava-asthma-plan"),
      patientId: String(ava._id),
      appointmentId: String(
        appointmentMap.get(taggedKey("appointment-ava-completed-checkup"))?._id ?? ""
      ),
      type: "consultation_summary",
      status: "finalized",
      title: "[Demo data] Asthma review consultation",
      summary:
        "Demo data - symptoms stable, rescue inhaler use reviewed, next review scheduled.",
      details: {
        diagnosis: "Demo data - mild asthma, stable at review.",
        plan: "Demo data - continue rescue inhaler plan and schedule routine follow-up."
      },
      author: {
        accountType: "doctor",
        accountId: String(meera._id),
        displayName: meera.name
      },
      finalizedAt: new Date(`${pastDate(42)}T10:30:00+05:30`),
      patientVisible: true,
      organizationId
    },
    {
      demoSeedKey: taggedKey("timeline-rahul-bp-followup"),
      patientId: String(rahul._id),
      appointmentId: String(
        appointmentMap.get(taggedKey("appointment-rahul-completed-followup"))?._id ?? ""
      ),
      type: "diagnosis_history",
      status: "finalized",
      title: "[Demo data] Hypertension follow-up",
      summary:
        "Demo data - blood pressure readings reviewed; sodium reduction and walking plan recorded.",
      details: {
        diagnosis: "Demo data - hypertension follow-up.",
        plan: "Demo data - sodium reduction, daily walking, and next review."
      },
      author: {
        accountType: "doctor",
        accountId: String(meera._id),
        displayName: meera.name
      },
      finalizedAt: new Date(`${pastDate(18)}T15:30:00+05:30`),
      patientVisible: true,
      organizationId
    },
    {
      demoSeedKey: taggedKey("timeline-mira-vaccine-entry"),
      patientId: String(mira._id),
      appointmentId: String(
        appointmentMap.get(taggedKey("appointment-mira-completed-vaccination"))?._id ?? ""
      ),
      type: "vaccination_record",
      status: "finalized",
      title: "[Demo data] Pediatric vaccination entry",
      summary: "Demo data - routine vaccination administered; no immediate reaction noted.",
      details: {
        vaccine: {
          name: "Demo data - Tdap booster",
          batchNumber: "DEMO-BATCH-2207",
          administeredOn: pastDate(9),
          nextDueOn: upcomingDateForWeekday(120, 2)
        }
      },
      author: {
        accountType: "doctor",
        accountId: String(arjun._id),
        displayName: arjun.name
      },
      finalizedAt: new Date(`${pastDate(9)}T11:30:00+05:30`),
      patientVisible: true,
      organizationId
    },
    {
      demoSeedKey: taggedKey("timeline-ava-prescription"),
      patientId: String(ava._id),
      type: "prescription_plan",
      status: "finalized",
      title: "[Demo data] Inhaler prescription example",
      summary: "Demo data - example medication plan for local prescription UI workflows.",
      details: {
        medicines: [
          {
            name: "Demo data - Salbutamol inhaler",
            dosage: "100 mcg",
            frequency: "As directed",
            instructions: "Use as directed by the fictional demo clinician.",
            duration: "Demo data - 4 weeks"
          }
        ]
      },
      author: {
        accountType: "doctor",
        accountId: String(meera._id),
        displayName: meera.name
      },
      finalizedAt: new Date(`${pastDate(41)}T12:00:00+05:30`),
      patientVisible: true,
      organizationId
    },
    {
      demoSeedKey: taggedKey("timeline-rahul-prescription"),
      patientId: String(rahul._id),
      type: "prescription_plan",
      status: "finalized",
      title: "[Demo data] Blood pressure prescription example",
      summary: "Demo data - example prescription for local medication timeline testing.",
      details: {
        medicines: [
          {
            name: "Demo data - Amlodipine",
            dosage: "5 mg",
            frequency: "Once daily",
            instructions: "Take in the morning for demo workflow purposes.",
            duration: "Demo data - 30 days"
          }
        ]
      },
      author: {
        accountType: "doctor",
        accountId: String(meera._id),
        displayName: meera.name
      },
      finalizedAt: new Date(`${pastDate(17)}T09:00:00+05:30`),
      patientVisible: true,
      organizationId
    }
  ];

  for (const record of records) {
    const created = await insertTaggedDocumentIfMissing("medical_records", record.demoSeedKey, {
      ...record
    });
    if (created) {
      counters.timelineRecordsCreated += 1;
    } else {
      counters.timelineRecordsSkipped += 1;
    }
  }
};

const seedFamilyMembers = async ({
  patientMap,
  organizationId,
  counters
}: {
  patientMap: Map<string, UserDocument>;
  organizationId: string;
  counters: SeedCounters;
}): Promise<void> => {
  const ava = patientMap.get(taggedKey("patient-ava-sharma"));
  const rahul = patientMap.get(taggedKey("patient-rahul-menon"));

  if (!ava || !rahul) {
    throw new Error("Demo family-member dependencies were not created.");
  }

  const familyMembers = [
    {
      demoSeedKey: taggedKey("family-ava-nisha"),
      ownerPatientId: String(ava._id),
      name: "[Demo data] Nisha Sharma",
      relationship: "Sister",
      dob: "1995-08-11",
      phone: "9000001002",
      email: "demo.family.nisha@medflow.local",
      linkedAccountId: null,
      consentScope: "Demo data - non-linked dependent/contact profile only.",
      emergencyContact: true,
      organizationId
    },
    {
      demoSeedKey: taggedKey("family-rahul-leela"),
      ownerPatientId: String(rahul._id),
      name: "[Demo data] Leela Menon",
      relationship: "Mother",
      dob: "1958-02-03",
      phone: "9000002002",
      email: "demo.family.leela@medflow.local",
      linkedAccountId: null,
      consentScope: "Demo data - non-linked family contact profile only.",
      emergencyContact: true,
      organizationId
    }
  ];

  for (const familyMember of familyMembers) {
    const created = await insertTaggedDocumentIfMissing(
      "family_members",
      familyMember.demoSeedKey,
      { ...familyMember }
    );
    if (created) {
      counters.familyMembersCreated += 1;
    } else {
      counters.familyMembersSkipped += 1;
    }
  }
};

const run = async (): Promise<void> => {
  assertDemoSeedAllowed();
  await connectDB();

  const counters: SeedCounters = {
    patientsCreated: 0,
    patientsSkipped: 0,
    doctorsCreated: 0,
    doctorsSkipped: 0,
    membershipsCreated: 0,
    membershipsSkipped: 0,
    appointmentsCreated: 0,
    appointmentsSkipped: 0,
    timelineRecordsCreated: 0,
    timelineRecordsSkipped: 0,
    familyMembersCreated: 0,
    familyMembersSkipped: 0
  };

  const organization = await getOrCreateDefaultOrganization();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const patientMap = new Map<string, UserDocument>();
  const doctorMap = new Map<string, DoctorDocument>();
  const appointmentMap = new Map<string, AppointmentDocument>();

  for (const seed of patients) {
    const { document, created } = await createPatientIfMissing(
      seed,
      passwordHash,
      organization.id
    );
    patientMap.set(seed.key, document);
    if (created) {
      counters.patientsCreated += 1;
    } else {
      counters.patientsSkipped += 1;
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

  for (const seed of appointmentSeeds) {
    const patient = patientMap.get(seed.patientKey);
    const doctor = doctorMap.get(seed.doctorKey);
    if (!patient || !doctor) {
      throw new Error(`Demo appointment ${seed.key} references a missing demo account.`);
    }

    const { document, created } = await createAppointmentIfMissing(
      seed,
      patient,
      doctor,
      organization.id
    );
    if (document) {
      appointmentMap.set(seed.key, document);
    }
    if (created) {
      counters.appointmentsCreated += 1;
    } else {
      counters.appointmentsSkipped += 1;
    }
  }

  await seedTimelineRecords({
    patientMap,
    doctorMap,
    appointmentMap,
    organizationId: organization.id,
    counters
  });

  await seedFamilyMembers({ patientMap, organizationId: organization.id, counters });

  console.info("Phase 2C local demo seed completed.", {
    organization: organization.name,
    label: DEMO_DATA_LABEL,
    demoSeedPrefix: DEMO_PREFIX,
    demoAccountEmails: [...patients.map((seed) => seed.email), ...doctors.map((seed) => seed.email)],
    demoPassword: DEMO_PASSWORD,
    ...counters
  });
  console.info(
    "No existing records were overwritten or deleted. Re-running this command skips tagged demo records."
  );
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Phase 2C demo seed failed");
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDB().then(() => mongoose.connection.removeAllListeners());
  });
