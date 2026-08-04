import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

process.env.NODE_ENV = "test";
process.env.PORT = "4100";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/medflow-test";
process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-enough-length";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-enough-length";
process.env.ACCESS_TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "30d";
process.env.JWT_ISSUER = "medflow-ai-test";
process.env.JWT_AUDIENCE = "medflow-ai-test-clients";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.ADMIN_URL = "http://localhost:5174";
process.env.ADMIN_EMAIL = "admin@example.com";
process.env.ADMIN_PASSWORD = "Password123";
process.env.CLOUDINARY_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_SECRET_KEY = "test-secret";
process.env.RAZORPAY_KEY_ID = "rzp_test";
process.env.RAZORPAY_KEY_SECRET = "rzp_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_secret";
process.env.CURRENCY = "INR";
process.env.EMAIL_FROM = "MedFlow AI <no-reply@example.test>";
process.env.OTP_MAX_ATTEMPTS = "3";
process.env.AUTH_LOCK_MAX_ATTEMPTS = "3";
process.env.AUTH_LOCK_DURATION = "1s";
process.env.LOG_LEVEL = "silent";
process.env.TWO_FACTOR_ENCRYPTION_KEY = "test-two-factor-encryption-key-32-bytes-minimum";
process.env.TOTP_ISSUER = "MedFlow AI Enterprise";
process.env.TOTP_SETUP_EXPIRES_IN = "10m";
process.env.TWO_FACTOR_CHALLENGE_EXPIRES_IN = "5m";
process.env.TWO_FACTOR_MAX_ATTEMPTS = "3";
process.env.RECOVERY_CODE_COUNT = "4";
process.env.DEFAULT_ORGANIZATION_NAME = "Test Hospital";
process.env.DEFAULT_ORGANIZATION_SLUG = "test-hospital";

const appointmentResponseSchema = z
  .object({
    _id: z.string(),
    clinicalNotes: z.string().optional(),
    patientSummary: z.unknown().optional()
  })
  .passthrough();
const appointmentsResponseSchema = z.object({
  appointments: z.array(appointmentResponseSchema)
});
const clinicalNotesResponseSchema = z.object({
  notes: z.object({ clinicalNotes: z.string() }).passthrough()
});
const patientSummaryResponseSchema = z
  .object({
    _id: z.string(),
    healthProfile: z.unknown().optional()
  })
  .passthrough();
const patientsResponseSchema = z.object({
  patients: z.array(patientSummaryResponseSchema)
});

const fakeDb = vi.hoisted(() => {
  type RecordData = Record<string, any> & { _id: string };
  type QueryFilter = Record<string, any>;

  const ids = {
    user: "000000000000000000000001",
    otherUser: "000000000000000000000002",
    unverifiedUser: "000000000000000000000005",
    suspendedUser: "000000000000000000000006",
    appointment: "000000000000000000000003",
    doctor: "000000000000000000000004",
    otherDoctor: "000000000000000000000009",
    defaultOrg: "000000000000000000000007",
    otherOrg: "000000000000000000000008"
  };

  let counter = 10;
  const users = new Map<string, RecordData>();
  const doctors = new Map<string, RecordData>();
  const appointments = new Map<string, RecordData>();
  const sessions = new Map<string, RecordData>();
  const challenges = new Map<string, RecordData>();
  const organizations = new Map<string, RecordData>();
  const memberships = new Map<string, RecordData>();
  const auditLogs = new Map<string, RecordData>();
  const authSecurity = new Map<string, RecordData>();
  const medicalRecords = new Map<string, RecordData>();
  const familyMembers = new Map<string, RecordData>();

  const makeId = () => counter.toString(16).padStart(24, "0");

  class FakeDocument {
    [key: string]: any;

    public constructor(data: Record<string, any>) {
      Object.assign(this, data);
      this._id ??= makeId();
      this.createdAt ??= new Date();
      this.updatedAt ??= new Date();
      counter += 1;
    }

    public async save() {
      return this;
    }

    public toObject(): Record<string, any> {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(this)) {
        if (typeof value !== "function") {
          result[key] = value;
        }
      }
      return result;
    }
  }

  const getByPath = (doc: RecordData, key: string): any =>
    key.split(".").reduce((value, part) => (value == null ? undefined : value[part]), doc);

  const hasField = (doc: RecordData, key: string) => getByPath(doc, key) !== undefined;

  const valueMatches = (doc: RecordData, key: string, expected: any): boolean => {
    const actual = getByPath(doc, key);

    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$exists" in expected) {
        return Boolean(expected.$exists) === hasField(doc, key);
      }

      if ("$gt" in expected) {
        const comparisonValue: unknown = expected.$gt;

        if (actual instanceof Date && comparisonValue instanceof Date) {
          return actual.getTime() > comparisonValue.getTime();
        }

        return Number(actual) > Number(comparisonValue);
      }

      if ("$lt" in expected) {
        const comparisonValue: unknown = expected.$lt;

        if (actual instanceof Date && comparisonValue instanceof Date) {
          return actual.getTime() < comparisonValue.getTime();
        }

        return Number(actual) < Number(comparisonValue);
      }

      if ("$ne" in expected) {
        return actual !== expected.$ne;
      }

      if ("$in" in expected && Array.isArray(expected.$in)) {
        const expectedValues = expected.$in as unknown[];
        return expectedValues.includes(actual);
      }
    }

    return actual === expected;
  };

  const matches = (doc: RecordData, filter: QueryFilter = {}) =>
    Object.entries(filter).every(([key, value]) => {
      if (key === "$or" && Array.isArray(value)) {
        return value.some((item) => matches(doc, item));
      }

      return valueMatches(doc, key, value);
    });

  const applyUpdate = (doc: RecordData, update: QueryFilter): void => {
    if ("$set" in update && typeof update.$set === "object") {
      Object.assign(doc, update.$set);
      return;
    }

    Object.assign(doc, update);
  };

  const stripSelectedFields = (value: any, select?: string): any => {
    if (!select || !value) {
      return value;
    }

    const stripOne = (item: any) => {
      const clone = item instanceof FakeDocument ? new FakeDocument(item.toObject()) : { ...item };
      for (const field of select.split(/\s+/)) {
        if (field.startsWith("-")) {
          delete clone[field.slice(1)];
        }
      }
      return clone;
    };

    return Array.isArray(value) ? value.map(stripOne) : stripOne(value);
  };

  const sortValue = (value: any, sortSpec: QueryFilter = { date: -1 }): any => {
    if (!Array.isArray(value)) {
      return value;
    }

    const [[field, direction]] = Object.entries(sortSpec);
    return [...value].sort((a, b) => {
      const left = getByPath(a, field);
      const right = getByPath(b, field);
      const leftValue = left instanceof Date ? left.getTime() : Number(left ?? 0);
      const rightValue = right instanceof Date ? right.getTime() : Number(right ?? 0);
      return Number(direction) < 0 ? rightValue - leftValue : leftValue - rightValue;
    });
  };

  const query = (value: any) => {
    let current = value;
    const api = {
      select: (select: string) => {
        current = stripSelectedFields(current, select);
        return api;
      },
      sort: (sortSpec: QueryFilter = { date: -1 }) => {
        current = sortValue(current, sortSpec);
        return api;
      },
      skip: (offset: number) => {
        current = Array.isArray(current) ? current.slice(offset) : current;
        return api;
      },
      limit: (limit: number) => {
        current = Array.isArray(current) ? current.slice(0, limit) : current;
        return api;
      },
      then: (resolve: (value: any) => unknown, reject: (reason?: any) => unknown) =>
        Promise.resolve(current).then(resolve, reject),
      catch: (reject: (reason?: any) => unknown) => Promise.resolve(current).catch(reject)
    };
    return api;
  };

  const findOneAndUpdate = (
    store: Map<string, RecordData>,
    filter: QueryFilter,
    update: QueryFilter
  ) => {
    const doc = [...store.values()].find((item) => matches(item, filter));

    if (!doc) {
      return Promise.resolve(null);
    }

    applyUpdate(doc, update);
    return Promise.resolve(doc);
  };

  const updateMany = (store: Map<string, RecordData>, filter: QueryFilter, update: QueryFilter) => {
    let modifiedCount = 0;

    for (const doc of store.values()) {
      if (matches(doc, filter)) {
        applyUpdate(doc, update);
        modifiedCount += 1;
      }
    }

    return Promise.resolve({ modifiedCount });
  };

  class UserModel extends FakeDocument {
    public override async save() {
      this.email = String(this.email).toLowerCase();
      this.normalizedEmail ??= this.email;

      if ([...users.values()].some((user) => user.email === this.email)) {
        const error = new Error("duplicate key") as Error & {
          code: number;
          keyValue: Record<string, unknown>;
        };
        error.code = 11000;
        error.keyValue = { email: this.email };
        throw error;
      }

      users.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve([...users.values()].find((user) => matches(user, filter)) ?? null);
    }

    public static findById(id: string) {
      return query(users.get(id) ?? null);
    }

    public static findByIdAndUpdate(id: string, update: QueryFilter) {
      const doc = users.get(id);
      if (doc) {
        applyUpdate(doc, update);
      }
      return Promise.resolve(doc ?? null);
    }

    public static updateMany(filter: QueryFilter, update: QueryFilter) {
      return updateMany(users, filter, update);
    }

    public static find(filter: QueryFilter = {}) {
      return query([...users.values()].filter((user) => matches(user, filter)));
    }
  }

  class DoctorModel extends FakeDocument {
    public override async save() {
      this.email = String(this.email).toLowerCase();
      this.normalizedEmail ??= this.email;
      doctors.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...doctors.values()].find((doctor) => matches(doctor, filter)) ?? null
      );
    }

    public static findById(id: string) {
      return query(doctors.get(id) ?? null);
    }

    public static findByIdAndUpdate(id: string, update: QueryFilter) {
      const doc = doctors.get(id);
      if (doc) {
        applyUpdate(doc, update);
      }
      return Promise.resolve(doc ?? null);
    }

    public static updateMany(filter: QueryFilter, update: QueryFilter) {
      return updateMany(doctors, filter, update);
    }

    public static find(filter: QueryFilter = {}) {
      return query([...doctors.values()].filter((doctor) => matches(doctor, filter)));
    }
  }

  class AppointmentModel extends FakeDocument {
    public override async save() {
      this.status ??= this.cancelled ? "cancelled" : this.isCompleted ? "completed" : "scheduled";
      const duplicate = [...appointments.values()].find(
        (appointment) =>
          appointment.docId === this.docId &&
          appointment.slotDate === this.slotDate &&
          appointment.slotTime === this.slotTime &&
          appointment.status === "scheduled" &&
          this.status === "scheduled"
      );
      if (duplicate) {
        const error = new Error("duplicate key") as Error & { code: number };
        error.code = 11000;
        throw error;
      }
      appointments.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...appointments.values()].find((appointment) => matches(appointment, filter)) ?? null
      );
    }

    public static findById(id: string) {
      return query(appointments.get(id) ?? null);
    }

    public static findByIdAndUpdate(id: string, update: QueryFilter) {
      const doc = appointments.get(id);
      if (doc) {
        applyUpdate(doc, update);
      }
      return Promise.resolve(doc ?? null);
    }

    public static find(filter: QueryFilter = {}) {
      return query(
        [...appointments.values()].filter((appointment) => matches(appointment, filter))
      );
    }

    public static updateMany(filter: QueryFilter, update: QueryFilter) {
      return updateMany(appointments, filter, update);
    }

    public static aggregate() {
      return Promise.resolve([]);
    }
  }

  class AuthSessionModel extends FakeDocument {
    public override async save() {
      sessions.set(this.sessionId, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...sessions.values()].find((session) => matches(session, filter)) ?? null
      );
    }

    public static findOneAndUpdate(filter: QueryFilter, update: QueryFilter) {
      return findOneAndUpdate(sessions, filter, update);
    }

    public static updateMany(filter: QueryFilter, update: QueryFilter) {
      return updateMany(sessions, filter, update);
    }

    public static find(filter: QueryFilter = {}) {
      return query([...sessions.values()].filter((session) => matches(session, filter)));
    }
  }

  class AuthChallengeModel extends FakeDocument {
    public override async save() {
      challenges.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...challenges.values()].find((challenge) => matches(challenge, filter)) ?? null
      );
    }

    public static findOneAndUpdate(filter: QueryFilter, update: QueryFilter) {
      return findOneAndUpdate(challenges, filter, update);
    }

    public static findByIdAndUpdate(id: string, update: QueryFilter) {
      const doc = challenges.get(String(id));
      if (doc) {
        applyUpdate(doc, update);
      }
      return Promise.resolve(doc ?? null);
    }

    public static updateMany(filter: QueryFilter, update: QueryFilter) {
      return updateMany(challenges, filter, update);
    }
  }

  class OrganizationModel extends FakeDocument {
    public override async save() {
      this.slug = String(this.slug).toLowerCase();
      organizations.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...organizations.values()].find((organization) => matches(organization, filter)) ?? null
      );
    }

    public static findById(id: string) {
      return Promise.resolve(organizations.get(id) ?? null);
    }

    public static find(filter: QueryFilter = {}) {
      return query(
        [...organizations.values()].filter((organization) => matches(organization, filter))
      );
    }
  }

  class OrganizationMembershipModel extends FakeDocument {
    public override async save() {
      memberships.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...memberships.values()].find((membership) => matches(membership, filter)) ?? null
      );
    }

    public static find(filter: QueryFilter = {}) {
      return query([...memberships.values()].filter((membership) => matches(membership, filter)));
    }

    public static updateMany(filter: QueryFilter, update: QueryFilter) {
      return updateMany(memberships, filter, update);
    }

    public static aggregate() {
      return Promise.resolve([]);
    }
  }

  class AuditLogModel extends FakeDocument {
    public override async save() {
      auditLogs.set(this._id, this as RecordData);
      return this;
    }

    public static find(filter: QueryFilter = {}) {
      return query([...auditLogs.values()].filter((auditLog) => matches(auditLog, filter)));
    }
  }

  class AuthSecurityModel extends FakeDocument {
    public override async save() {
      authSecurity.set(`${this.accountType}:${this.accountId}`, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...authSecurity.values()].find((security) => matches(security, filter)) ?? null
      );
    }
  }

  class MedicalRecordModel extends FakeDocument {
    public override async save() {
      this.status ??= "draft";
      this.patientVisible ??= false;
      if (this.status === "finalized") {
        this.finalizedAt ??= new Date();
      }
      medicalRecords.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...medicalRecords.values()].find((record) => matches(record, filter)) ?? null
      );
    }

    public static findById(id: string) {
      return query(medicalRecords.get(id) ?? null);
    }

    public static find(filter: QueryFilter = {}) {
      return query([...medicalRecords.values()].filter((record) => matches(record, filter)));
    }
  }

  class FamilyMemberModel extends FakeDocument {
    public override async save() {
      familyMembers.set(this._id, this as RecordData);
      return this;
    }

    public static findOne(filter: QueryFilter) {
      return Promise.resolve(
        [...familyMembers.values()].find((familyMember) => matches(familyMember, filter)) ?? null
      );
    }

    public static find(filter: QueryFilter = {}) {
      return query([...familyMembers.values()].filter((familyMember) => matches(familyMember, filter)));
    }

    public static deleteOne(filter: QueryFilter) {
      const item = [...familyMembers.values()].find((familyMember) => matches(familyMember, filter));
      if (item) {
        familyMembers.delete(item._id);
        return Promise.resolve({ deletedCount: 1 });
      }
      return Promise.resolve({ deletedCount: 0 });
    }
  }

  const patientPassword = "PatientPass12!";
  const doctorPassword = "DoctorPass12!";

  const reset = () => {
    users.clear();
    doctors.clear();
    appointments.clear();
    sessions.clear();
    challenges.clear();
    organizations.clear();
    memberships.clear();
    auditLogs.clear();
    authSecurity.clear();
    medicalRecords.clear();
    familyMembers.clear();
    counter = 10;

    organizations.set(
      ids.defaultOrg,
      new FakeDocument({
        _id: ids.defaultOrg,
        name: "Test Hospital",
        slug: "test-hospital",
        status: "ACTIVE",
        settings: {}
      }) as RecordData
    );

    organizations.set(
      ids.otherOrg,
      new FakeDocument({
        _id: ids.otherOrg,
        name: "Other Hospital",
        slug: "other-hospital",
        status: "ACTIVE",
        settings: {}
      }) as RecordData
    );

    users.set(
      ids.user,
      new FakeDocument({
        _id: ids.user,
        name: "Patient One",
        email: "patient@example.com",
        normalizedEmail: "patient@example.com",
        password: `hashed:${patientPassword}`,
        image: "image",
        phone: "1234567890",
        address: { line1: "Line 1", line2: "Line 2" },
        gender: "Male",
        dob: "2000-01-01",
        healthProfile: {
          bloodGroup: "Not known",
          allergies: [],
          chronicConditions: [],
          medicalNotes: "",
          emergencyContact: { name: "", relationship: "", phone: "" },
          insurance: { provider: "", policyNumber: "", expiryDate: "" }
        },
        emailVerified: true,
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        authenticationProvider: "LOCAL",
        role: "PATIENT",
        organizationId: ids.defaultOrg
      }) as RecordData
    );

    users.set(
      ids.otherUser,
      new FakeDocument({
        _id: ids.otherUser,
        name: "Patient Two",
        email: "other@example.com",
        normalizedEmail: "other@example.com",
        password: `hashed:${patientPassword}`,
        image: "image",
        phone: "1234567890",
        address: { line1: "Line 1", line2: "Line 2" },
        gender: "Female",
        dob: "2000-01-01",
        healthProfile: {
          bloodGroup: "A+",
          allergies: ["Pollen"],
          chronicConditions: [],
          medicalNotes: "Private patient note",
          emergencyContact: { name: "Contact", relationship: "Sibling", phone: "1234567890" },
          insurance: { provider: "Provider", policyNumber: "POLICY", expiryDate: "2030-01-01" }
        },
        emailVerified: true,
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        authenticationProvider: "LOCAL",
        role: "PATIENT",
        organizationId: ids.defaultOrg
      }) as RecordData
    );

    users.set(
      ids.unverifiedUser,
      new FakeDocument({
        _id: ids.unverifiedUser,
        name: "Pending Patient",
        email: "pending@example.com",
        normalizedEmail: "pending@example.com",
        password: `hashed:${patientPassword}`,
        image: "image",
        emailVerified: false,
        accountStatus: "PENDING_VERIFICATION",
        failedLoginAttempts: 0,
        authenticationProvider: "LOCAL",
        role: "PATIENT",
        organizationId: ids.defaultOrg
      }) as RecordData
    );

    users.set(
      ids.suspendedUser,
      new FakeDocument({
        _id: ids.suspendedUser,
        name: "Suspended Patient",
        email: "suspended@example.com",
        normalizedEmail: "suspended@example.com",
        password: `hashed:${patientPassword}`,
        image: "image",
        emailVerified: true,
        accountStatus: "SUSPENDED",
        failedLoginAttempts: 0,
        authenticationProvider: "LOCAL",
        role: "PATIENT",
        organizationId: ids.defaultOrg
      }) as RecordData
    );

    doctors.set(
      ids.doctor,
      new FakeDocument({
        _id: ids.doctor,
        name: "Doctor One",
        email: "doctor@example.com",
        normalizedEmail: "doctor@example.com",
        password: `hashed:${doctorPassword}`,
        image: "image",
        speciality: "General physician",
        degree: "MBBS",
        experience: "5 Years",
        about: "About",
        available: true,
        fees: 500,
        slots_booked: {},
        availability: {
          enabled: true,
          timezone: "Asia/Kolkata",
          consultationDurationMinutes: 30,
          weeklySchedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            slots: ["10:00", "10:30", "11:00"]
          }))
        },
        address: { line1: "Clinic", line2: "City" },
        date: Date.now(),
        emailVerified: true,
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        authenticationProvider: "LOCAL",
        role: "DOCTOR",
        organizationId: ids.defaultOrg
      }) as RecordData
    );

    doctors.set(
      ids.otherDoctor,
      new FakeDocument({
        _id: ids.otherDoctor,
        name: "Doctor Two",
        email: "doctor-two@example.com",
        normalizedEmail: "doctor-two@example.com",
        password: `hashed:${doctorPassword}`,
        image: "image",
        speciality: "Cardiology",
        degree: "MD",
        experience: "7 Years",
        about: "About",
        available: true,
        fees: 700,
        slots_booked: {},
        availability: {
          enabled: true,
          timezone: "Asia/Kolkata",
          consultationDurationMinutes: 30,
          weeklySchedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            slots: ["10:00", "10:30", "11:00"]
          }))
        },
        address: { line1: "Clinic Two", line2: "City" },
        date: Date.now(),
        emailVerified: true,
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        authenticationProvider: "LOCAL",
        role: "DOCTOR",
        organizationId: ids.defaultOrg
      }) as RecordData
    );

    appointments.set(
      ids.appointment,
      new FakeDocument({
        _id: ids.appointment,
        userId: ids.otherUser,
        docId: ids.doctor,
        slotDate: "17_7_2026",
        slotTime: "10:00 AM",
        userData: {},
        docData: {},
        amount: 500,
        organizationId: ids.defaultOrg,
        date: Date.now(),
        cancelled: false,
        payment: false,
        isCompleted: false,
        status: "scheduled"
      }) as RecordData
    );

    const seedMembership = (
      accountId: string,
      accountType: "patient" | "doctor" | "admin",
      role: "PATIENT" | "DOCTOR" | "HOSPITAL_ADMIN",
      organizationId = ids.defaultOrg
    ) => {
      const membership = new FakeDocument({
        organizationId,
        accountId,
        accountType,
        role,
        scopedPermissions: [],
        status: "ACTIVE",
        activatedAt: new Date()
      }) as RecordData;
      memberships.set(membership._id, membership);
    };

    seedMembership(ids.user, "patient", "PATIENT");
    seedMembership(ids.otherUser, "patient", "PATIENT");
    seedMembership(ids.unverifiedUser, "patient", "PATIENT");
    seedMembership(ids.suspendedUser, "patient", "PATIENT");
    seedMembership(ids.doctor, "doctor", "DOCTOR");
    seedMembership(ids.otherDoctor, "doctor", "DOCTOR");
    seedMembership("admin@example.com", "admin", "HOSPITAL_ADMIN");
  };

  return {
    ids,
    reset,
    users,
    doctors,
    appointments,
    sessions,
    challenges,
    organizations,
    memberships,
    auditLogs,
    authSecurity,
    medicalRecords,
    familyMembers,
    patientPassword,
    doctorPassword,
    UserModel,
    DoctorModel,
    AppointmentModel,
    AuthSessionModel,
    AuthChallengeModel,
    OrganizationModel,
    OrganizationMembershipModel,
    AuditLogModel,
    AuthSecurityModel,
    MedicalRecordModel,
    FamilyMemberModel
  };
});

vi.mock("../src/models/User.js", () => ({ default: fakeDb.UserModel }));
vi.mock("../src/models/Doctor.js", () => ({ default: fakeDb.DoctorModel }));
vi.mock("../src/models/Appointment.js", () => ({ default: fakeDb.AppointmentModel }));
vi.mock("../src/models/AuthSession.js", () => ({ default: fakeDb.AuthSessionModel }));
vi.mock("../src/models/AuthChallenge.js", () => ({ default: fakeDb.AuthChallengeModel }));
vi.mock("../src/models/Organization.js", () => ({ default: fakeDb.OrganizationModel }));
vi.mock("../src/models/OrganizationMembership.js", () => ({
  default: fakeDb.OrganizationMembershipModel
}));
vi.mock("../src/models/AuditLog.js", () => ({ default: fakeDb.AuditLogModel }));
vi.mock("../src/models/AuthSecurity.js", () => ({ default: fakeDb.AuthSecurityModel }));
vi.mock("../src/models/MedicalRecord.js", () => ({
  default: fakeDb.MedicalRecordModel,
  MEDICAL_RECORD_TYPES: [
    "consultation_summary",
    "diagnosis_history",
    "allergy_update",
    "vaccination_record",
    "report_metadata",
    "treatment_plan",
    "prescription_plan"
  ],
  MEDICAL_RECORD_STATUSES: ["draft", "finalized"]
}));
vi.mock("../src/models/FamilyMember.js", () => ({ default: fakeDb.FamilyMemberModel }));
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed:${password}`),
    compare: vi.fn(async (password: string, hash: string) => hash === `hashed:${password}`)
  }
}));
const cloudinaryMock = vi.hoisted(() => ({
  config: vi.fn(),
  upload: vi.fn(async () => ({ secure_url: "https://res.cloudinary.com/test/doctor.png" }))
}));
vi.mock("cloudinary", () => ({
  v2: {
    config: cloudinaryMock.config,
    uploader: {
      upload: cloudinaryMock.upload
    }
  }
}));

describe("MedFlow backend foundation and Phase 1B authentication", () => {
  let app: Express;
  let emailService: typeof import("../src/services/emailService.js");
  let backendEnv: typeof import("../src/config/env.js");

  const strongPassword = "NewPatient12!";
  const tokenFor = (id: string) =>
    jwt.sign({ id, role: "patient" }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
  const doctorTokenFor = (id: string) =>
    jwt.sign({ id, role: "doctor" }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
  const adminToken = () =>
    jwt.sign(
      `${process.env.ADMIN_EMAIL as string}${process.env.ADMIN_PASSWORD as string}`,
      process.env.JWT_SECRET as string
    );
  const nextAvailableDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    if (date.getDay() === 0) date.setDate(date.getDate() + 1);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  };

  const latestPreviewToken = (purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET") => {
    const item = [...emailService.getDevelopmentEmailOutbox()]
      .reverse()
      .find((message) => message.purpose === purpose);
    return item?.previewToken;
  };

  const latestPreviewOtp = (
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_VERIFICATION"
  ) => {
    const item = [...emailService.getDevelopmentEmailOutbox()]
      .reverse()
      .find((message) => message.purpose === purpose);
    return item?.previewOtp;
  };

  const cookieFrom = (response: request.Response) => {
    const cookie = response.headers["set-cookie"];
    return Array.isArray(cookie) ? cookie[0] : String(cookie);
  };

  const secretFromOtpAuthUri = (uri: string) => new URL(uri).searchParams.get("secret") ?? "";

  const addDoctorRequest = (email: string) =>
    request(app)
      .post("/api/admin/add-doctor")
      .set("aToken", adminToken())
      .field("name", "New Doctor")
      .field("email", email)
      .field("password", "DoctorPass12!")
      .field("speciality", "General physician")
      .field("degree", "MBBS")
      .field("experience", "5 Years")
      .field("about", "A careful clinician.")
      .field("fees", "500")
      .field("address", JSON.stringify({ line1: "Clinic", line2: "City" }))
      .attach("image", Buffer.from("doctor image"), {
        filename: "doctor.png",
        contentType: "image/png"
      });

  beforeAll(async () => {
    app = (await import("../src/app.js")).default;
    emailService = await import("../src/services/emailService.js");
    backendEnv = await import("../src/config/env.js");
  });

  beforeEach(() => {
    backendEnv.env.NODE_ENV = "test";
    backendEnv.env.DEVELOPMENT_AUTO_VERIFY_EMAIL = "false";
    backendEnv.env.CLOUDINARY_NAME = "test-cloud";
    backendEnv.env.CLOUDINARY_API_KEY = "test-key";
    backendEnv.env.CLOUDINARY_SECRET_KEY = "test-secret";
    cloudinaryMock.config.mockReset();
    cloudinaryMock.upload.mockReset();
    cloudinaryMock.upload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/test/doctor.png"
    });
    fakeDb.reset();
    emailService.clearDevelopmentEmailOutbox();
  });

  it("returns health status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("returns readiness status without opening a real database connection", async () => {
    const response = await request(app).get("/ready").expect(503);

    expect(response.body.success).toBe(false);
    expect(response.body.data.database).toBe("disconnected");
  });

  it("assigns request IDs and returns them on errors", async () => {
    const requestId = "phase-1d-request-id";
    const response = await request(app)
      .get("/api/user/get-profile")
      .set("x-request-id", requestId)
      .expect(401);

    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it("serves a structurally valid OpenAPI document without real secrets", async () => {
    const response = await request(app).get("/api-docs.json").expect(200);

    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.info.title).toBe("MedFlow AI API");
    expect(response.body.paths["/api/v1/auth/login"]).toBeTruthy();
    expect(response.body.paths["/api/v1/auth/2fa/login/verify"]).toBeTruthy();
    expect(response.body.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(JSON.stringify(response.body)).not.toContain("sk_live");
    expect(JSON.stringify(response.body)).not.toContain("mongodb+srv://");
  });

  it("redacts sensitive values before operational logging", async () => {
    const { redactSensitive } = await import("../src/utils/logger.js");
    const redacted = redactSensitive({
      email: "patient@example.test",
      password: "Password12!",
      nested: {
        authorization: "Bearer secret",
        recoveryCode: "AAAA-BBBB"
      }
    });

    expect(redacted).toEqual({
      email: "patient@example.test",
      password: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        recoveryCode: "[REDACTED]"
      }
    });
  });

  it("keeps development auto-verification disabled unless explicitly enabled", async () => {
    const response = await request(app)
      .post("/api/user/register")
      .send({
        name: "New Patient",
        email: "New.Patient@Example.com",
        password: strongPassword,
        confirmPassword: strongPassword,
        role: "admin"
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeUndefined();
    expect(response.body.data.account.email).toBe("new.patient@example.com");
    expect(response.body.data.account.role).toBe("patient");
    expect(response.body.data.account.emailVerified).toBe(false);
    expect(response.body.data.account.password).toBeUndefined();
    expect(fakeDb.users.get(response.body.data.account.id)?.accountStatus).toBe(
      "PENDING_VERIFICATION"
    );
    expect(latestPreviewToken("EMAIL_VERIFICATION")).toBeTruthy();
  });

  it("auto-verifies development registrations and allows immediate login when explicitly enabled", async () => {
    backendEnv.env.DEVELOPMENT_AUTO_VERIFY_EMAIL = "true";

    const response = await request(app)
      .post("/api/user/register")
      .send({
        name: "Auto Verified",
        email: "auto.verified@example.com",
        password: strongPassword
      })
      .expect(201);

    expect(response.body.data.account.emailVerified).toBe(true);
    expect(response.body.data.verificationExpiresAt).toBeUndefined();
    expect(fakeDb.users.get(response.body.data.account.id)?.accountStatus).toBe("ACTIVE");
    expect(fakeDb.users.get(response.body.data.account.id)?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(latestPreviewToken("EMAIL_VERIFICATION")).toBeUndefined();
    expect(
      [...fakeDb.challenges.values()].some(
        (challenge) =>
          challenge.accountId === response.body.data.account.id &&
          challenge.purpose === "EMAIL_VERIFICATION"
      )
    ).toBe(false);

    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "auto.verified@example.com", password: strongPassword })
      .expect(200);

    expect(login.body.token).toBeTruthy();
    expect(login.body.data.account.emailVerified).toBe(true);
  });

  it("keeps production registrations pending even when development auto-verify is set", async () => {
    backendEnv.env.NODE_ENV = "production";
    backendEnv.env.DEVELOPMENT_AUTO_VERIFY_EMAIL = "true";

    const response = await request(app)
      .post("/api/user/register")
      .send({
        name: "Production Patient",
        email: "production.patient@example.com",
        password: strongPassword
      })
      .expect(201);

    expect(response.body.data.account.emailVerified).toBe(false);
    expect(response.body.data.verificationExpiresAt).toBeTruthy();
    expect(fakeDb.users.get(response.body.data.account.id)?.accountStatus).toBe(
      "PENDING_VERIFICATION"
    );
    expect(latestPreviewToken("EMAIL_VERIFICATION")).toBeTruthy();

    await request(app)
      .post("/api/user/login")
      .send({ email: "production.patient@example.com", password: strongPassword })
      .expect(403);
  });

  it("rejects weak registration passwords and duplicate patient emails", async () => {
    await request(app)
      .post("/api/user/register")
      .send({ name: "A", email: "bad-email", password: "short" })
      .expect(400);

    const duplicate = await request(app)
      .post("/api/user/register")
      .send({
        name: "Patient One",
        email: "patient@example.com",
        password: strongPassword
      })
      .expect(409);

    expect(duplicate.body.message).toContain("email");
  });

  it("logs in patients with access token and HttpOnly refresh cookie", async () => {
    const response = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    expect(response.body.token).toBeTruthy();
    expect(response.body.data.account.role).toBe("patient");
    expect(cookieFrom(response)).toContain(`${process.env.COOKIE_NAME ?? "medflow_refresh"}=`);
    expect(cookieFrom(response)).toContain("HttpOnly");
    expect(fakeDb.sessions.size).toBe(1);
  });

  it("uses equivalent invalid credential behavior for wrong and unknown patient logins", async () => {
    const wrong = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: "WrongPatient12!" })
      .expect(401);
    const unknown = await request(app)
      .post("/api/user/login")
      .send({ email: "unknown@example.com", password: "WrongPatient12!" })
      .expect(401);

    expect(wrong.body.message).toBe("Invalid email or password");
    expect(unknown.body.message).toBe("Invalid email or password");
  });

  it("enforces unverified, suspended, and temporary lockout policies", async () => {
    await request(app)
      .post("/api/user/login")
      .send({ email: "pending@example.com", password: fakeDb.patientPassword })
      .expect(403);

    await request(app)
      .post("/api/user/login")
      .send({ email: "suspended@example.com", password: fakeDb.patientPassword })
      .expect(403);

    for (let index = 0; index < 3; index += 1) {
      await request(app)
        .post("/api/user/login")
        .send({ email: "patient@example.com", password: "WrongPatient12!" })
        .expect(401);
    }

    await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(423);
  });

  it("preserves doctor and admin login compatibility", async () => {
    const doctor = await request(app)
      .post("/api/doctor/login")
      .send({ email: "doctor@example.com", password: fakeDb.doctorPassword })
      .expect(200);
    const admin = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@example.com", password: "Password123" })
      .expect(200);

    expect(doctor.body.token).toBeTruthy();
    expect(admin.body.token).toBeTruthy();
  });

  it("creates doctors in development without Cloudinary credentials using a placeholder image", async () => {
    backendEnv.env.NODE_ENV = "development";
    backendEnv.env.CLOUDINARY_NAME = "placeholder";
    backendEnv.env.CLOUDINARY_API_KEY = "";
    backendEnv.env.CLOUDINARY_SECRET_KEY = "replace-with-cloudinary-secret-key";

    await addDoctorRequest("dev-placeholder-doctor@example.com").expect(201);

    const doctor = [...fakeDb.doctors.values()].find(
      (item) => item.email === "dev-placeholder-doctor@example.com"
    );
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
    expect(doctor?.image).toContain("data:image/svg+xml");
  });

  it("creates doctors in development with configured Cloudinary credentials via upload", async () => {
    backendEnv.env.NODE_ENV = "development";
    backendEnv.env.CLOUDINARY_NAME = "configured-cloud";
    backendEnv.env.CLOUDINARY_API_KEY = "configured-key";
    backendEnv.env.CLOUDINARY_SECRET_KEY = "configured-secret";
    cloudinaryMock.upload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/test/uploaded-doctor.png"
    });

    await addDoctorRequest("dev-upload-doctor@example.com").expect(201);

    const doctor = [...fakeDb.doctors.values()].find(
      (item) => item.email === "dev-upload-doctor@example.com"
    );
    expect(cloudinaryMock.upload).toHaveBeenCalledTimes(1);
    expect(doctor?.image).toBe("https://res.cloudinary.com/test/uploaded-doctor.png");
  });

  it("fails doctor creation in production when Cloudinary credentials are missing", async () => {
    backendEnv.env.NODE_ENV = "production";
    backendEnv.env.CLOUDINARY_NAME = "placeholder";
    backendEnv.env.CLOUDINARY_API_KEY = "";
    backendEnv.env.CLOUDINARY_SECRET_KEY = "";

    const response = await addDoctorRequest("prod-missing-cloudinary@example.com").expect(500);

    expect(response.body.message).toContain("Cloudinary credentials are not configured");
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
    expect(
      [...fakeDb.doctors.values()].some(
        (item) => item.email === "prod-missing-cloudinary@example.com"
      )
    ).toBe(false);
  });

  it("refreshes with rotation and detects old refresh-token reuse", async () => {
    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);
    const oldCookie = cookieFrom(login);

    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldCookie)
      .send({})
      .expect(200);
    const newCookie = cookieFrom(refresh);

    expect(refresh.body.data.accessToken).toBeTruthy();
    expect(newCookie).not.toBe(oldCookie);

    await request(app).post("/api/v1/auth/refresh").set("Cookie", oldCookie).send({}).expect(401);
    expect([...fakeDb.sessions.values()][0]?.revocationReason).toBe("refresh-token-reuse-detected");
  });

  it("logs out current and all sessions", async () => {
    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieFrom(login))
      .send({})
      .expect(200);
    expect([...fakeDb.sessions.values()][0]?.revocationReason).toBe("logout");

    const first = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);
    await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${first.body.token}`)
      .send({})
      .expect(200);

    expect([...fakeDb.sessions.values()].filter((session) => !session.revokedAt)).toHaveLength(0);
  });

  it("enforces enterprise RBAC on admin and audit routes", async () => {
    const patientLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    await request(app).get("/api/admin/dashboard").expect(401);
    await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${patientLogin.body.token}`)
      .expect(401);
    await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${patientLogin.body.token}`)
      .expect(403);

    const adminLogin = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@example.com", password: "Password123" })
      .expect(200);

    await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .expect(200);
  });

  it("blocks hospital-admin super-admin operations and self-role escalation", async () => {
    const adminLogin = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@example.com", password: "Password123" })
      .expect(200);

    await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({ name: "New Hospital", slug: "new-hospital" })
      .expect(403);

    await request(app)
      .put(`/api/v1/organizations/${fakeDb.ids.defaultOrg}/memberships`)
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({
        accountId: "admin@example.com",
        accountType: "admin",
        role: "SUPER_ADMIN",
        scopedPermissions: [],
        status: "ACTIVE"
      })
      .expect(403);
  });

  it("prevents cross-organization appointment access even for owned patient IDs", async () => {
    fakeDb.appointments.get(fakeDb.ids.appointment)!.userId = fakeDb.ids.user;
    fakeDb.appointments.get(fakeDb.ids.appointment)!.organizationId = fakeDb.ids.otherOrg;

    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    await request(app)
      .post("/api/user/cancel-appointment")
      .set("Authorization", `Bearer ${login.body.token}`)
      .set("x-organization-id", fakeDb.ids.otherOrg)
      .send({ appointmentId: fakeDb.ids.appointment, organizationId: fakeDb.ids.otherOrg })
      .expect(404);

    expect(fakeDb.appointments.get(fakeDb.ids.appointment)?.cancelled).toBe(false);
  });

  it("uses maintained TOTP behavior with a small replay-protected clock window", async () => {
    const { createOtpAuthUri, generateTotpCode, generateTotpSecret, verifyTotp } =
      await import("../src/utils/totp.js");
    const secret = generateTotpSecret();
    const now = 1_700_000_015_000;
    const currentCode = generateTotpCode(secret, now);
    const previousCode = generateTotpCode(secret, now - 30_000);
    const uri = createOtpAuthUri("MedFlow AI Enterprise", "patient@example.com", secret);

    expect(secret).toBeTruthy();
    expect(new URL(uri).searchParams.get("issuer")).toBe("MedFlow AI Enterprise");
    await expect(verifyTotp(secret, currentCode, { now, window: 0 })).resolves.toMatchObject({
      valid: true
    });
    await expect(verifyTotp(secret, previousCode, { now, window: 1 })).resolves.toMatchObject({
      valid: true
    });
    await expect(verifyTotp(secret, previousCode, { now, window: 0 })).resolves.toMatchObject({
      valid: false
    });

    const firstVerification = await verifyTotp(secret, currentCode, { now, window: 0 });
    expect(firstVerification.valid).toBe(true);
    await expect(
      verifyTotp(secret, currentCode, {
        now,
        window: 1,
        lastAcceptedStep: firstVerification.step
      })
    ).resolves.toMatchObject({ valid: false });
  });

  it("supports TOTP setup, two-step login, recovery codes, and challenge replay protection", async () => {
    const { generateTotpCode } = await import("../src/utils/totp.js");
    const firstLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    const expiredSetup = await request(app)
      .post("/api/v1/auth/2fa/setup/begin")
      .set("Authorization", `Bearer ${firstLogin.body.token}`)
      .send({})
      .expect(200);
    const expiredSecret = secretFromOtpAuthUri(expiredSetup.body.data.setup.otpauthUri);
    fakeDb.authSecurity.get(`patient:${fakeDb.ids.user}`)!.pendingSetupExpiresAt = new Date(
      Date.now() - 1_000
    );
    await request(app)
      .post("/api/v1/auth/2fa/setup/confirm")
      .set("Authorization", `Bearer ${firstLogin.body.token}`)
      .send({ totpCode: generateTotpCode(expiredSecret) })
      .expect(400);

    const setup = await request(app)
      .post("/api/v1/auth/2fa/setup/begin")
      .set("Authorization", `Bearer ${firstLogin.body.token}`)
      .send({})
      .expect(200);
    const secret = secretFromOtpAuthUri(setup.body.data.setup.otpauthUri);
    const setupUri = new URL(setup.body.data.setup.otpauthUri);

    expect(setupUri.protocol).toBe("otpauth:");
    expect(setupUri.searchParams.get("issuer")).toBe("MedFlow AI Enterprise");
    expect(setup.body.data.setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    await request(app)
      .post("/api/v1/auth/2fa/setup/confirm")
      .set("Authorization", `Bearer ${firstLogin.body.token}`)
      .send({ totpCode: "000000" })
      .expect(400);

    const setupCode = generateTotpCode(secret);
    const confirm = await request(app)
      .post("/api/v1/auth/2fa/setup/confirm")
      .set("Authorization", `Bearer ${firstLogin.body.token}`)
      .send({ totpCode: setupCode })
      .expect(200);

    expect(confirm.body.data.recoveryCodes).toHaveLength(4);
    const securityRecord = fakeDb.authSecurity.get(`patient:${fakeDb.ids.user}`)! as {
      encryptedTotpSecret?: string;
      recoveryCodes: Array<{ codeHash?: string }>;
    };
    expect(securityRecord.encryptedTotpSecret).toBeTruthy();
    expect(JSON.stringify(securityRecord)).not.toContain(secret);
    expect(JSON.stringify(securityRecord)).not.toContain(confirm.body.data.recoveryCodes[0]);
    expect(securityRecord.recoveryCodes.every((code: { codeHash?: string }) => code.codeHash)).toBe(
      true
    );
    expect(JSON.stringify([...fakeDb.auditLogs.values()])).not.toContain(secret);
    expect(JSON.stringify(confirm.body.data)).not.toContain(secret);
    expect(
      [...fakeDb.sessions.values()].some((session) => session.revocationReason === "2fa-enabled")
    ).toBe(true);

    const primaryOnlyLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(202);
    expect(primaryOnlyLogin.body.data.requiresTwoFactor).toBe(true);
    expect(primaryOnlyLogin.body.data.accessToken).toBeUndefined();

    await request(app)
      .get("/api/user/get-profile")
      .set("Authorization", `Bearer ${primaryOnlyLogin.body.data.twoFactorToken}`)
      .expect(401);

    await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({ twoFactorToken: firstLogin.body.token, totpCode: generateTotpCode(secret) })
      .expect(401);

    await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({ twoFactorToken: primaryOnlyLogin.body.data.twoFactorToken, totpCode: "111111" })
      .expect(401);

    fakeDb.authSecurity.get(`patient:${fakeDb.ids.user}`)!.lastTotpStep = undefined;
    const secondStepCode = generateTotpCode(secret);
    const secondFactorLogin = await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({
        twoFactorToken: primaryOnlyLogin.body.data.twoFactorToken,
        totpCode: secondStepCode
      })
      .expect(200);

    expect(secondFactorLogin.body.token).toBeTruthy();

    await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({
        twoFactorToken: primaryOnlyLogin.body.data.twoFactorToken,
        totpCode: secondStepCode
      })
      .expect(401);

    const expiredChallengeLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(202);
    [...fakeDb.challenges.values()]
      .filter((challenge) => challenge.purpose === "LOGIN_VERIFICATION" && !challenge.consumedAt)
      .forEach((challenge) => {
        challenge.expiresAt = new Date(Date.now() - 1_000);
      });
    fakeDb.authSecurity.get(`patient:${fakeDb.ids.user}`)!.lastTotpStep = undefined;
    await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({
        twoFactorToken: expiredChallengeLogin.body.data.twoFactorToken,
        totpCode: generateTotpCode(secret)
      })
      .expect(401);

    const attemptLimitLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(202);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app)
        .post("/api/v1/auth/2fa/login/verify")
        .send({ twoFactorToken: attemptLimitLogin.body.data.twoFactorToken, totpCode: "222222" })
        .expect(401);
    }
    expect(
      [...fakeDb.challenges.values()].some(
        (challenge) => challenge.purpose === "LOGIN_VERIFICATION" && challenge.revokedAt
      )
    ).toBe(true);

    const recoveryLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(202);
    const recoveryCode = confirm.body.data.recoveryCodes[0];

    await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({
        twoFactorToken: recoveryLogin.body.data.twoFactorToken,
        recoveryCode
      })
      .expect(200);

    const recoveryReuseLogin = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(202);

    await request(app)
      .post("/api/v1/auth/2fa/login/verify")
      .send({
        twoFactorToken: recoveryReuseLogin.body.data.twoFactorToken,
        recoveryCode
      })
      .expect(401);

    fakeDb.authSecurity.get(`patient:${fakeDb.ids.user}`)!.lastTotpStep = undefined;
    const disableCode = generateTotpCode(secret);
    await request(app)
      .post("/api/v1/auth/2fa/disable")
      .set("Authorization", `Bearer ${secondFactorLogin.body.token}`)
      .send({ password: fakeDb.patientPassword, totpCode: disableCode })
      .expect(200);

    expect(fakeDb.authSecurity.get(`patient:${fakeDb.ids.user}`)?.twoFactorEnabled).toBe(false);
    expect(
      [...fakeDb.sessions.values()].some((session) => session.revocationReason === "2fa-disabled")
    ).toBe(true);
    expect(
      [...fakeDb.auditLogs.values()].some((auditLog) => auditLog.eventType === "auth.2fa.disabled")
    ).toBe(true);
    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookieFrom(secondFactorLogin))
      .send({})
      .expect(401);
  });

  it("lists and revokes own sessions and blocks revoked refresh tokens", async () => {
    const first = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);
    await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    const sessions = await request(app)
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${first.body.token}`)
      .expect(200);

    const sessionList = sessions.body.data.sessions as Array<{ current: boolean }>;
    expect(sessionList).toHaveLength(2);
    expect(sessionList.filter((session) => session.current)).toHaveLength(1);

    await request(app)
      .post("/api/v1/auth/sessions/revoke-others")
      .set("Authorization", `Bearer ${first.body.token}`)
      .send({})
      .expect(200);

    expect([...fakeDb.sessions.values()].filter((session) => !session.revokedAt)).toHaveLength(1);

    await request(app)
      .delete(`/api/v1/auth/sessions/${first.body.data.sessionId}`)
      .set("Authorization", `Bearer ${first.body.token}`)
      .expect(200);

    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookieFrom(first))
      .send({})
      .expect(401);
  });

  it("verifies email tokens and rejects reuse", async () => {
    await request(app)
      .post("/api/user/register")
      .send({
        name: "Verify Patient",
        email: "verify@example.com",
        password: strongPassword
      })
      .expect(201);

    const token = latestPreviewToken("EMAIL_VERIFICATION");
    expect(token).toBeTruthy();

    await request(app).post("/api/v1/auth/verify-email").send({ token }).expect(200);
    expect(
      [...fakeDb.users.values()].find((user) => user.email === "verify@example.com")?.emailVerified
    ).toBe(true);
    await request(app).post("/api/v1/auth/verify-email").send({ token }).expect(400);
  });

  it("handles password recovery with generic forgot response and session revocation", async () => {
    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "patient@example.com", password: fakeDb.patientPassword })
      .expect(200);

    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "patient@example.com" })
      .expect(200);
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "missing@example.com" })
      .expect(200);

    const token = latestPreviewToken("PASSWORD_RESET");
    expect(token).toBeTruthy();

    await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "ChangedPass12!", confirmPassword: "ChangedPass12!" })
      .expect(200);

    expect(
      [...fakeDb.sessions.values()].find((session) => session.refreshTokenHash)?.revocationReason
    ).toBe("password-reset");
    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookieFrom(login))
      .send({})
      .expect(401);
    await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "AnotherPass12!", confirmPassword: "AnotherPass12!" })
      .expect(400);
  });

  it("rejects reused and weak reset passwords", async () => {
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "patient@example.com" })
      .expect(200);
    const token = latestPreviewToken("PASSWORD_RESET");

    await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "short", confirmPassword: "short" })
      .expect(400);

    await request(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token,
        password: fakeDb.patientPassword,
        confirmPassword: fakeDb.patientPassword
      })
      .expect(400);
  });

  it("sends and verifies OTP codes with purpose binding and attempt limits", async () => {
    await request(app)
      .post("/api/v1/auth/otp/request")
      .send({ email: "pending@example.com", purpose: "EMAIL_VERIFICATION" })
      .expect(200);

    const otp = latestPreviewOtp("EMAIL_VERIFICATION");
    expect(otp).toBeTruthy();

    await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ email: "pending@example.com", purpose: "PASSWORD_RESET", otp })
      .expect(400);
    await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ email: "pending@example.com", purpose: "EMAIL_VERIFICATION", otp: "000000" })
      .expect(400);
    await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ email: "pending@example.com", purpose: "EMAIL_VERIFICATION", otp })
      .expect(200);

    expect(fakeDb.users.get(fakeDb.ids.unverifiedUser)?.emailVerified).toBe(true);
  });

  it("rejects missing, invalid, wrong-type, and password-stale access tokens", async () => {
    await request(app).get("/api/user/get-profile").expect(401);
    await request(app).get("/api/user/get-profile").set("token", "not-a-real-token").expect(401);

    const refreshLike = jwt.sign(
      {
        tokenType: "refresh",
        role: "patient",
        sessionId: "session",
        tokenId: "token",
        tokenFamilyId: "family"
      },
      process.env.JWT_REFRESH_SECRET as string,
      {
        subject: fakeDb.ids.user,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: "1h"
      }
    );
    await request(app)
      .get("/api/user/get-profile")
      .set("Authorization", `Bearer ${refreshLike}`)
      .expect(401);

    const staleToken = jwt.sign(
      { tokenType: "access", role: "patient", id: fakeDb.ids.user },
      process.env.JWT_ACCESS_SECRET as string,
      {
        subject: fakeDb.ids.user,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: "1h"
      }
    );
    fakeDb.users.get(fakeDb.ids.user)!.passwordChangedAt = new Date(Date.now() + 1000);

    await request(app)
      .get("/api/user/get-profile")
      .set("Authorization", `Bearer ${staleToken}`)
      .expect(401);
  });

  it("allows protected route access with a valid legacy token header", async () => {
    const response = await request(app)
      .get("/api/user/get-profile")
      .set("token", tokenFor(fakeDb.ids.user))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.userData.email).toBe("patient@example.com");
    expect(response.body.userData.password).toBeUndefined();
  });

  it("rejects invalid ObjectIds safely", async () => {
    const response = await request(app)
      .post("/api/user/book-appointment")
      .set("Authorization", `Bearer ${tokenFor(fakeDb.ids.user)}`)
      .send({ docId: "bad-id", slotDate: "17_7_2026", slotTime: "10:00 AM" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
  });

  it("enforces appointment ownership", async () => {
    const response = await request(app)
      .post("/api/user/cancel-appointment")
      .set("token", tokenFor(fakeDb.ids.user))
      .send({ appointmentId: fakeDb.ids.appointment })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Unauthorized action");
    expect(fakeDb.appointments.get(fakeDb.ids.appointment)?.cancelled).toBe(false);
  });

  it("enforces payment ownership before initializing external payment", async () => {
    const response = await request(app)
      .post("/api/user/payment-razorpay")
      .set("token", tokenFor(fakeDb.ids.user))
      .send({ appointmentId: fakeDb.ids.appointment })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Unauthorized action");
  });

  describe("Phase 2B healthcare core", () => {
    const healthProfilePayload = {
      dob: "1994-06-12",
      gender: "Female",
      bloodGroup: "O+",
      allergies: ["Penicillin", "Pollen", "Penicillin"],
      chronicConditions: ["Asthma"],
      medicalNotes: "Uses an inhaler as prescribed.",
      emergencyContact: {
        name: "Sam Patient",
        relationship: "Sibling",
        phone: "+91 9876543210"
      },
      insurance: {
        provider: "Test Health",
        policyNumber: "TH-100",
        expiryDate: "2030-12-31"
      }
    };

    it("updates only the authenticated patient's validated health profile and audits it", async () => {
      const response = await request(app)
        .put("/api/user/health-profile")
        .set("token", tokenFor(fakeDb.ids.user))
        .send(healthProfilePayload)
        .expect(200);

      expect(response.body.healthProfile.bloodGroup).toBe("O+");
      expect(response.body.healthProfile.allergies).toEqual(["Penicillin", "Pollen"]);
      expect(fakeDb.users.get(fakeDb.ids.otherUser)?.healthProfile.bloodGroup).toBe("A+");
      expect(
        [...fakeDb.auditLogs.values()].some(
          (entry) => entry.eventType === "patient.health_profile.updated"
        )
      ).toBe(true);
    });

    it("rejects invalid health-profile input and non-patient access", async () => {
      await request(app)
        .put("/api/user/health-profile")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ ...healthProfilePayload, dob: "not-a-date" })
        .expect(400);

      await request(app)
        .get("/api/user/health-profile")
        .set("aToken", adminToken())
        .expect(401);
    });

    it("lets a doctor update only their own persisted availability", async () => {
      const availability = {
        enabled: true,
        timezone: "Asia/Kolkata",
        consultationDurationMinutes: 45,
        weeklySchedule: [{ dayOfWeek: 1, slots: ["09:00", "09:45"] }],
        doctorId: fakeDb.ids.otherDoctor
      };

      await request(app)
        .put("/api/doctor/availability")
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send(availability)
        .expect(200);

      expect(fakeDb.doctors.get(fakeDb.ids.doctor)?.availability.consultationDurationMinutes).toBe(45);
      expect(fakeDb.doctors.get(fakeDb.ids.otherDoctor)?.availability.consultationDurationMinutes).toBe(30);
    });

    it("books a persisted valid slot and rejects a duplicate active booking", async () => {
      const slotDate = nextAvailableDate();
      const payload = { docId: fakeDb.ids.doctor, slotDate, slotTime: "10:00" };

      const first = await request(app)
        .post("/api/user/book-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send(payload)
        .expect(201);
      expect(first.body.appointment.slotDate).toBe(slotDate);

      const availableSlots = await request(app)
        .get(`/api/doctor/${fakeDb.ids.doctor}/available-slots?from=${slotDate}&days=1`)
        .expect(200);
      expect(availableSlots.body.availability.days[0].slots).not.toContain("10:00");

      await request(app)
        .post("/api/user/book-appointment")
        .set("token", tokenFor(fakeDb.ids.otherUser))
        .send(payload)
        .expect(409);

      expect(
        [...fakeDb.auditLogs.values()].some((entry) => entry.eventType === "appointment.booked")
      ).toBe(true);
    });

    it("enforces patient cancellation status rules and creates an audit event", async () => {
      const booking = await request(app)
        .post("/api/user/book-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ docId: fakeDb.ids.doctor, slotDate: nextAvailableDate(), slotTime: "10:30" })
        .expect(201);
      const appointmentId = booking.body.appointment.appointmentId as string;

      await request(app)
        .post("/api/user/cancel-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ appointmentId })
        .expect(200);
      await request(app)
        .post("/api/user/cancel-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ appointmentId })
        .expect(409);

      expect(fakeDb.appointments.get(appointmentId)?.status).toBe("cancelled");
      expect(
        [...fakeDb.auditLogs.values()].some(
          (entry) => entry.eventType === "appointment.cancelled" && entry.target.id === appointmentId
        )
      ).toBe(true);
    });

    it("allows assigned-doctor private notes while denying other doctors and patient responses", async () => {
      fakeDb.users.get(fakeDb.ids.user)!.healthProfile = {
        bloodGroup: "AB-",
        allergies: ["Latex"],
        chronicConditions: ["Private condition"],
        medicalNotes: "Private patient health detail",
        emergencyContact: { name: "Private Contact", relationship: "Sibling", phone: "1234567890" },
        insurance: { provider: "Private Insurer", policyNumber: "POLICY", expiryDate: "2030-01-01" }
      };

      const booking = await request(app)
        .post("/api/user/book-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ docId: fakeDb.ids.doctor, slotDate: nextAvailableDate(), slotTime: "11:00" })
        .expect(201);
      const appointmentId = booking.body.appointment.appointmentId as string;

      await request(app)
        .patch(`/api/doctor/appointments/${appointmentId}/clinical-notes`)
        .set("dToken", doctorTokenFor(fakeDb.ids.otherDoctor))
        .send({ clinicalNotes: "Must not be written" })
        .expect(404);

      await request(app)
        .patch(`/api/doctor/appointments/${appointmentId}/clinical-notes`)
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({ clinicalNotes: "Private assigned-doctor note" })
        .expect(200);

      const doctorAppointments = await request(app)
        .get("/api/doctor/appointments")
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .expect(200);
      const doctorView = appointmentsResponseSchema.parse(doctorAppointments.body).appointments.find(
        (appointment: { _id: string }) => appointment._id === appointmentId
      );
      expect(doctorView.clinicalNotes).toBe("Private assigned-doctor note");
      expect(doctorView.patientSummary).toBeUndefined();
      expect(JSON.stringify(doctorView)).not.toContain("Private patient health detail");
      expect(JSON.stringify(doctorView)).not.toContain("Latex");

      const adminAppointments = await request(app)
        .get("/api/admin/appointments")
        .set("aToken", adminToken())
        .expect(200);
      const adminListView = appointmentsResponseSchema.parse(adminAppointments.body).appointments.find(
        (appointment: { _id: string }) => appointment._id === appointmentId
      );
      expect(adminListView.clinicalNotes).toBeUndefined();

      const adminNotes = await request(app)
        .get(`/api/admin/appointments/${appointmentId}/clinical-notes`)
        .set("aToken", adminToken())
        .expect(200);
      expect(clinicalNotesResponseSchema.parse(adminNotes.body).notes.clinicalNotes).toBe(
        "Private assigned-doctor note"
      );

      const patientAppointments = await request(app)
        .get("/api/user/appointments")
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(200);
      const patientView = appointmentsResponseSchema.parse(patientAppointments.body).appointments.find(
        (appointment: { _id: string }) => appointment._id === appointmentId
      );
      expect(patientView.clinicalNotes).toBeUndefined();
      expect(patientView.patientSummary).toBeUndefined();

      await request(app)
        .patch(`/api/doctor/appointments/${appointmentId}/clinical-notes`)
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ clinicalNotes: "Patient write attempt" })
        .expect(401);
    });

    it("lets the assigned doctor complete a scheduled appointment once", async () => {
      const booking = await request(app)
        .post("/api/user/book-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ docId: fakeDb.ids.doctor, slotDate: nextAvailableDate(), slotTime: "10:30" })
        .expect(201);
      const appointmentId = booking.body.appointment.appointmentId as string;

      await request(app)
        .post("/api/doctor/complete-appointment")
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({ appointmentId })
        .expect(200);
      await request(app)
        .post("/api/doctor/complete-appointment")
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({ appointmentId })
        .expect(409);
      expect(fakeDb.appointments.get(appointmentId)?.status).toBe("completed");
    });

    it("returns tenant-scoped safe patient summaries to authorized admins", async () => {
      fakeDb.users.get(fakeDb.ids.otherUser)!.organizationId = fakeDb.ids.otherOrg;

      const response = await request(app)
        .get("/api/admin/patients?search=patient&status=ALL")
        .set("aToken", adminToken())
        .expect(200);

      const patients = patientsResponseSchema.parse(response.body).patients;
      expect(patients.some((patient) => patient._id === fakeDb.ids.user)).toBe(true);
      expect(patients.some((patient) => patient._id === fakeDb.ids.otherUser)).toBe(false);
      expect(patients[0]?.healthProfile).toBeUndefined();

      await request(app)
        .get(`/api/admin/patients/${fakeDb.ids.otherUser}/appointments`)
        .set("aToken", adminToken())
        .expect(404);
      await request(app)
        .get("/api/admin/patients")
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(401);
    });

    it("keeps Phase 2C records doctor-authorized and shows only finalized patient-visible records", async () => {
      const booking = await request(app)
        .post("/api/user/book-appointment")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({ docId: fakeDb.ids.doctor, slotDate: nextAvailableDate(), slotTime: "10:30" })
        .expect(201);
      const appointmentId = booking.body.appointment.appointmentId as string;

      await request(app)
        .post(`/api/doctor/appointments/${appointmentId}/medical-records`)
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({
          type: "consultation_summary",
          title: "Too early",
          summary: "This should not save before completion.",
          details: {},
          patientVisible: true,
          status: "finalized"
        })
        .expect(409);

      await request(app)
        .post("/api/doctor/complete-appointment")
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({ appointmentId })
        .expect(200);

      await request(app)
        .post(`/api/doctor/appointments/${appointmentId}/medical-records`)
        .set("dToken", doctorTokenFor(fakeDb.ids.otherDoctor))
        .send({
          type: "consultation_summary",
          title: "Unauthorized",
          summary: "Wrong doctor should not save.",
          details: {},
          patientVisible: true,
          status: "finalized"
        })
        .expect(404);

      const draft = await request(app)
        .post(`/api/doctor/appointments/${appointmentId}/medical-records`)
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({
          type: "treatment_plan",
          title: "Draft care plan",
          summary: "Draft plan should stay hidden from the patient timeline.",
          details: { plan: "Draft only" },
          patientVisible: true,
          status: "draft"
        })
        .expect(201);

      const finalized = await request(app)
        .post(`/api/doctor/appointments/${appointmentId}/medical-records`)
        .set("dToken", doctorTokenFor(fakeDb.ids.doctor))
        .send({
          type: "prescription_plan",
          title: "Final prescription",
          summary: "Patient-visible finalized prescription.",
          details: {
            medicines: [
              {
                name: "Amoxicillin",
                dosage: "500 mg",
                frequency: "Twice daily",
                duration: "5 days",
                instructions: "With food"
              }
            ]
          },
          patientVisible: true,
          status: "finalized"
        })
        .expect(201);

      const timeline = await request(app)
        .get("/api/user/medical-timeline")
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(200);

      const timelineText = JSON.stringify(timeline.body.timeline);
      expect(timelineText).toContain("Final prescription");
      expect(timelineText).not.toContain("Draft care plan");
      expect(timelineText).not.toContain("Private assigned-doctor note");

      await request(app)
        .get("/api/admin/medical-records?status=finalized&type=prescription_plan")
        .set("aToken", adminToken())
        .expect(200)
        .expect((response) => {
          const records = response.body.records as Array<{ _id: string }>;
          const finalizedRecord = finalized.body.record as { _id: string };
          const draftRecord = draft.body.record as { _id: string };
          expect(records.some((record) => record._id === finalizedRecord._id)).toBe(true);
          expect(records.some((record) => record._id === draftRecord._id)).toBe(false);
        });

      expect(
        [...fakeDb.auditLogs.values()].some(
          (entry) => entry.eventType === "medical_record.created"
        )
      ).toBe(true);
    });

    it("enforces Phase 2C family-member ownership", async () => {
      const created = await request(app)
        .post("/api/user/family-members")
        .set("token", tokenFor(fakeDb.ids.user))
        .send({
          name: "Family Contact",
          relationship: "Sibling",
          dob: "1998-01-20",
          phone: "1234567890",
          email: "family@example.com",
          emergencyContact: true
        })
        .expect(201);

      await request(app)
        .get("/api/user/family-members")
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(200)
        .expect((response) => {
          expect(response.body.members).toHaveLength(1);
          expect(response.body.members[0].linkedAccountId).toBeUndefined();
          expect(response.body.members[0].consentScope).toContain("No medical-record access");
        });

      await request(app)
        .delete(`/api/user/family-members/${created.body.member._id}`)
        .set("token", tokenFor(fakeDb.ids.otherUser))
        .expect(404);

      await request(app)
        .delete(`/api/user/family-members/${created.body.member._id}`)
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(200);

      expect(fakeDb.familyMembers.size).toBe(0);
    });

    it("returns a safe health card QR payload without patient secrets or raw identifiers", async () => {
      const response = await request(app)
        .get("/api/user/health-card")
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(200);

      expect(response.body.card.cardId).toMatch(/^MF-/);
      expect(response.body.card.qrPayload).not.toContain(fakeDb.ids.user);
      expect(response.body.card.qrPayload).not.toContain("patient@example.com");
      expect(response.body.card.qrPayload).not.toContain("1234567890");
      expect(response.body.card.qrDataUrl).toContain("data:image/png;base64,");

      await request(app)
        .get(`/api/user/health-card/lookup/${response.body.card.lookupId}`)
        .set("token", tokenFor(fakeDb.ids.user))
        .expect(200)
        .expect((lookupResponse) => {
          expect(JSON.stringify(lookupResponse.body.status)).not.toContain("bloodGroup");
          expect(JSON.stringify(lookupResponse.body.status)).not.toContain(fakeDb.ids.user);
        });
    });
  });

  it("returns a consistent 404 response", async () => {
    const response = await request(app).get("/api/nope").expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Route not found");
  });

  it("returns a global error response for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/user/login")
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Malformed JSON request body");
  });
});
