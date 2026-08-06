type OpenApiSchema = Record<string, unknown>;

const veterinaryIds = {
  userId: "66aa7f0f0f0f0f0f0f0f0f01",
  ownerId: "66aa7f0f0f0f0f0f0f0f0f02",
  petId: "66aa7f0f0f0f0f0f0f0f0f04",
  doctorId: "66aa7f0f0f0f0f0f0f0f0f03",
  veterinarianId: "66aa7f0f0f0f0f0f0f0f0f05",
  vaccinationId: "66aa7f0f0f0f0f0f0f0f0f06",
  recordId: "66aa7f0f0f0f0f0f0f0f0f07",
  reportId: "66aa7f0f0f0f0f0f0f0f0f08"
} as const;

const veterinaryPaginationExample = { page: 1, limit: 20, total: 42, pages: 3 };

const petOwnerRequestExample = {
  userId: veterinaryIds.userId,
  phone: "+91 9876543210",
  address: { line1: "12 Clinic Road", line2: "Bengaluru" },
  emergencyContact: "Priya Sharma",
  emergencyPhone: "+91 9876543211"
};

const petOwnerExample = {
  _id: veterinaryIds.ownerId,
  ...petOwnerRequestExample,
  createdAt: "2026-08-04T09:00:00.000Z",
  updatedAt: "2026-08-04T09:00:00.000Z"
};

const petRequestExample = {
  ownerId: veterinaryIds.ownerId,
  name: "Bruno",
  species: "Dog",
  breed: "Labrador Retriever",
  gender: "Male",
  age: 4,
  weight: 28.5,
  color: "Golden",
  dateOfBirth: "2021-04-12",
  microchipNumber: "IND-MICRO-001",
  vaccinationStatus: "up_to_date",
  allergies: ["chicken"],
  medicalHistory: ["Ear infection"],
  profileImage: "https://res.cloudinary.com/demo/pet.jpg"
};

const petExample = {
  _id: veterinaryIds.petId,
  ...petRequestExample,
  createdAt: "2026-08-04T09:05:00.000Z",
  updatedAt: "2026-08-04T09:05:00.000Z"
};

const veterinarianRequestExample = {
  doctorId: veterinaryIds.doctorId,
  specialization: ["Small animal medicine", "Dermatology"],
  clinicName: "VetFlow Care Clinic",
  yearsOfExperience: 8,
  licenseNumber: "VET-KA-12345",
  consultationFee: 750,
  availability: {
    enabled: true,
    timezone: "Asia/Kolkata",
    consultationDurationMinutes: 30,
    weeklySchedule: [{ dayOfWeek: 1, slots: ["10:00", "10:30"] }]
  }
};

const veterinarianExample = {
  _id: veterinaryIds.veterinarianId,
  ...veterinarianRequestExample,
  createdAt: "2026-08-04T09:10:00.000Z",
  updatedAt: "2026-08-04T09:10:00.000Z"
};

const vaccinationRequestExample = {
  petId: veterinaryIds.petId,
  vaccineName: "Rabies",
  dueDate: "2026-09-01",
  completedDate: "2026-09-01",
  nextDose: "2027-09-01",
  veterinarian: veterinaryIds.veterinarianId,
  notes: "Annual booster administered."
};

const vaccinationExample = {
  _id: veterinaryIds.vaccinationId,
  ...vaccinationRequestExample,
  createdAt: "2026-08-04T09:15:00.000Z",
  updatedAt: "2026-08-04T09:15:00.000Z"
};

const petMedicalRecordRequestExample = {
  petId: veterinaryIds.petId,
  veterinarianId: veterinaryIds.veterinarianId,
  diagnosis: "Otitis externa",
  symptoms: ["Head shaking", "Ear odor"],
  medications: [
    {
      name: "Otic drops",
      dosage: "4 drops",
      frequency: "Twice daily",
      duration: "7 days",
      instructions: "Apply after cleaning the ear."
    }
  ],
  prescriptions: [
    {
      medicationName: "Otic drops",
      dosage: "4 drops",
      frequency: "Twice daily",
      duration: "7 days",
      instructions: "Return if irritation persists."
    }
  ],
  treatment: "Ear cleaning and topical medication.",
  laboratoryReports: [
    {
      title: "Ear swab cytology",
      reportType: "Cytology",
      result: "Mild yeast overgrowth",
      uploadedAt: "2026-08-04T09:20:00.000Z"
    }
  ],
  attachments: [
    {
      fileName: "ear-photo.jpg",
      fileUrl: "https://res.cloudinary.com/demo/ear-photo.jpg",
      fileType: "image/jpeg",
      uploadedAt: "2026-08-04T09:20:00.000Z"
    }
  ],
  visitDate: "2026-08-04T09:20:00.000Z",
  followUpDate: "2026-08-18T09:20:00.000Z"
};

const petMedicalRecordExample = {
  _id: veterinaryIds.recordId,
  ...petMedicalRecordRequestExample,
  createdAt: "2026-08-04T09:20:00.000Z",
  updatedAt: "2026-08-04T09:20:00.000Z"
};

const aiReportRequestExample = {
  petId: veterinaryIds.petId,
  symptoms: ["Vomiting", "Low appetite"],
  uploadedImages: ["https://res.cloudinary.com/demo/pet-symptom.jpg"],
  aiSummary: "Preliminary assessment suggests monitoring hydration and clinical evaluation.",
  possibleConditions: ["Gastritis"],
  severity: "moderate",
  recommendations: ["Book a veterinary visit"],
  generatedAt: "2026-08-04T09:25:00.000Z"
};

const aiReportExample = {
  _id: veterinaryIds.reportId,
  ...aiReportRequestExample,
  createdAt: "2026-08-04T09:25:00.000Z",
  updatedAt: "2026-08-04T09:25:00.000Z"
};

const veterinaryStatsExample = {
  totalPets: 12,
  totalPetOwners: 8,
  totalVeterinarians: 3,
  totalVaccinations: 24,
  totalAiReports: 6,
  recentMedicalRecords: [petMedicalRecordExample]
};

const veterinarySummaryExample = {
  stats: veterinaryStatsExample,
  recentVaccinations: [vaccinationExample],
  recentAiReports: [aiReportExample],
  preliminaryAssessmentNotice:
    "AI reports are preliminary assessment reports only and are not a diagnosis."
};

const veterinarySuccessExample = (message: string, data?: OpenApiSchema) => ({
  success: true,
  message,
  ...(data === undefined ? {} : { data })
});

const veterinarySuccessResponse = (
  description: string,
  message: string,
  data?: OpenApiSchema
) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/SuccessResponse" },
      example: veterinarySuccessExample(message, data)
    }
  }
});

const veterinaryRequestBody = (schemaName: string, example: OpenApiSchema) => ({
  required: true,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schemaName}` },
      example
    }
  }
});

const veterinaryPathParameter = (name: string, example: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
  example
});

const veterinaryTargetParameters = [
  {
    name: "ownerId",
    in: "query",
    schema: { type: "string" },
    example: veterinaryIds.ownerId
  },
  {
    name: "userId",
    in: "query",
    schema: { type: "string" },
    example: veterinaryIds.userId
  }
];

const veterinaryListParameters = (searchExample: string, sortExample: string) => [
  { name: "page", in: "query", schema: { type: "integer", default: 1 }, example: 1 },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", default: 20, maximum: 100 },
    example: 20
  },
  { name: "search", in: "query", schema: { type: "string" }, example: searchExample },
  { name: "sort", in: "query", schema: { type: "string" }, example: sortExample }
];

const petFilterParameters = [
  ...veterinaryListParameters("Bruno", "-createdAt"),
  { name: "ownerId", in: "query", schema: { type: "string" }, example: veterinaryIds.ownerId },
  { name: "species", in: "query", schema: { type: "string" }, example: "Dog" },
  { name: "breed", in: "query", schema: { type: "string" }, example: "Labrador Retriever" },
  { name: "age", in: "query", schema: { type: "number" }, example: 4 },
  { name: "minAge", in: "query", schema: { type: "number" }, example: 1 },
  { name: "maxAge", in: "query", schema: { type: "number" }, example: 10 },
  { name: "weight", in: "query", schema: { type: "number" }, example: 28.5 },
  { name: "minWeight", in: "query", schema: { type: "number" }, example: 5 },
  { name: "maxWeight", in: "query", schema: { type: "number" }, example: 40 }
];

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "MedFlow AI API",
    version: "1.0.0",
    description:
      "MedFlow AI backend API covering authentication, RBAC, organizations, sessions, audit logs, patient health profiles, doctor availability, appointments, clinical workflows, and payments."
  },
  servers: [{ url: "http://localhost:4000", description: "Local development backend" }],
  tags: [
    { name: "Health" },
    { name: "Authentication" },
    { name: "TwoFactor" },
    { name: "Sessions" },
    { name: "Authorization" },
    { name: "Organizations" },
    { name: "Audit" },
    { name: "Users" },
    { name: "Doctors" },
    { name: "Admin" },
    { name: "Payments" },
    { name: "Veterinary" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      refreshCookie: {
        type: "apiKey",
        in: "cookie",
        name: "medflow_refresh",
        description: "HttpOnly refresh-token cookie set by login and refresh responses."
      },
      legacyPatientToken: { type: "apiKey", in: "header", name: "token" },
      legacyAdminToken: { type: "apiKey", in: "header", name: "aToken" },
      legacyDoctorToken: { type: "apiKey", in: "header", name: "dToken" }
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Request completed" },
          data: { type: "object", additionalProperties: true }
        }
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "message", "errors"],
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
          errors: { type: "array", items: { type: "string" } },
          requestId: { type: "string", example: "b7cf8e63-2afb-452f-8e1e-1f2fb6d4f814" }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "patient@example.test" },
          password: { type: "string", format: "password", example: "StrongPassword12!" }
        }
      },
      RegistrationRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Alex Patient" },
          email: { type: "string", format: "email", example: "patient@example.test" },
          password: { type: "string", format: "password", example: "StrongPassword12!" }
        }
      },
      TwoFactorVerifyRequest: {
        type: "object",
        required: ["twoFactorToken"],
        properties: {
          twoFactorToken: {
            type: "string",
            description: "Short-lived restricted challenge token. Not valid for protected APIs."
          },
          totpCode: { type: "string", example: "123456" },
          recoveryCode: { type: "string", example: "ABCD1234-EFGH5678" }
        }
      },
      Session: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          displayName: { type: "string" },
          device: { type: "string" },
          ipAddress: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          lastActiveAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          current: { type: "boolean" }
        }
      },
      AuditLog: {
        type: "object",
        properties: {
          eventType: { type: "string", example: "auth.login.success" },
          actor: { type: "object", additionalProperties: true },
          organizationId: { type: "string" },
          target: { type: "object", additionalProperties: true },
          metadata: { type: "object", additionalProperties: true },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      HealthProfile: {
        type: "object",
        required: ["dob", "gender", "bloodGroup", "allergies", "chronicConditions"],
        properties: {
          dob: { type: "string", format: "date" },
          gender: { type: "string" },
          bloodGroup: { type: "string", example: "O+" },
          allergies: { type: "array", items: { type: "string" } },
          chronicConditions: { type: "array", items: { type: "string" } },
          medicalNotes: { type: "string", maxLength: 2000 },
          emergencyContact: { type: "object", additionalProperties: { type: "string" } },
          insurance: { type: "object", additionalProperties: { type: "string" } }
        }
      },
      DoctorAvailability: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          timezone: { type: "string", example: "Asia/Kolkata" },
          consultationDurationMinutes: { type: "integer", minimum: 15, maximum: 120 },
          weeklySchedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
                slots: { type: "array", items: { type: "string", example: "10:30" } }
              }
            }
          }
        }
      },
      AppointmentStatus: { type: "string", enum: ["scheduled", "completed", "cancelled"] },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 42 },
          pages: { type: "integer", example: 3 }
        }
      },
      PetOwnerRequest: {
        type: "object",
        properties: {
          userId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f01" },
          phone: { type: "string", example: "+91 9876543210" },
          address: {
            type: "object",
            properties: {
              line1: { type: "string", example: "12 Clinic Road" },
              line2: { type: "string", example: "Bengaluru" }
            }
          },
          emergencyContact: { type: "string", example: "Priya Sharma" },
          emergencyPhone: { type: "string", example: "+91 9876543211" }
        }
      },
      PetOwnerUpdateRequest: {
        type: "object",
        description: "Partial pet owner update. Provide at least one field.",
        properties: {
          phone: { type: "string", example: "+91 9876543212" },
          address: {
            type: "object",
            properties: {
              line1: { type: "string", example: "24 Wellness Avenue" },
              line2: { type: "string", example: "Bengaluru" }
            }
          },
          emergencyContact: { type: "string", example: "Aarav Sharma" },
          emergencyPhone: { type: "string", example: "+91 9876543213" }
        }
      },
      PetRequest: {
        type: "object",
        required: ["name", "species"],
        properties: {
          ownerId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f02" },
          name: { type: "string", example: "Bruno" },
          species: { type: "string", example: "Dog" },
          breed: { type: "string", example: "Labrador Retriever" },
          gender: { type: "string", example: "Male" },
          age: { type: "number", example: 4 },
          weight: { type: "number", example: 28.5 },
          color: { type: "string", example: "Golden" },
          dateOfBirth: { type: "string", format: "date", example: "2021-04-12" },
          microchipNumber: { type: "string", example: "IND-MICRO-001" },
          vaccinationStatus: { type: "string", example: "up_to_date" },
          allergies: { type: "array", items: { type: "string" }, example: ["chicken"] },
          medicalHistory: { type: "array", items: { type: "string" }, example: ["Ear infection"] },
          profileImage: { type: "string", example: "https://res.cloudinary.com/demo/pet.jpg" }
        }
      },
      PetUpdateRequest: {
        type: "object",
        description: "Partial pet update. Provide at least one field.",
        properties: {
          ownerId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f02" },
          name: { type: "string", example: "Bruno" },
          species: { type: "string", example: "Dog" },
          breed: { type: "string", example: "Labrador Retriever" },
          gender: { type: "string", example: "Male" },
          age: { type: "number", example: 4 },
          weight: { type: "number", example: 29 },
          color: { type: "string", example: "Golden" },
          dateOfBirth: { type: "string", format: "date", example: "2021-04-12" },
          microchipNumber: { type: "string", example: "IND-MICRO-001" },
          vaccinationStatus: { type: "string", example: "booster_due" },
          allergies: { type: "array", items: { type: "string" }, example: ["chicken"] },
          medicalHistory: { type: "array", items: { type: "string" }, example: ["Ear infection"] },
          profileImage: { type: "string", example: "https://res.cloudinary.com/demo/pet.jpg" }
        }
      },
      VeterinarianRequest: {
        type: "object",
        required: ["doctorId", "clinicName", "yearsOfExperience", "licenseNumber", "consultationFee"],
        properties: {
          doctorId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f03" },
          specialization: {
            type: "array",
            items: { type: "string" },
            example: ["Small animal medicine", "Dermatology"]
          },
          clinicName: { type: "string", example: "VetFlow Care Clinic" },
          yearsOfExperience: { type: "integer", example: 8 },
          licenseNumber: { type: "string", example: "VET-KA-12345" },
          consultationFee: { type: "number", example: 750 },
          availability: { $ref: "#/components/schemas/DoctorAvailability" }
        }
      },
      VeterinarianUpdateRequest: {
        type: "object",
        description: "Partial veterinarian profile update. Provide at least one field.",
        properties: {
          specialization: {
            type: "array",
            items: { type: "string" },
            example: ["Small animal medicine", "Emergency care"]
          },
          clinicName: { type: "string", example: "VetFlow Advanced Care" },
          yearsOfExperience: { type: "integer", example: 9 },
          licenseNumber: { type: "string", example: "VET-KA-12345" },
          consultationFee: { type: "number", example: 850 },
          availability: { $ref: "#/components/schemas/DoctorAvailability" }
        }
      },
      VaccinationRequest: {
        type: "object",
        required: ["petId", "vaccineName", "dueDate"],
        properties: {
          petId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f04" },
          vaccineName: { type: "string", example: "Rabies" },
          dueDate: { type: "string", format: "date", example: "2026-09-01" },
          completedDate: { type: "string", format: "date", example: "2026-09-01" },
          nextDose: { type: "string", format: "date", example: "2027-09-01" },
          veterinarian: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f05" },
          notes: { type: "string", example: "Annual booster administered." }
        }
      },
      VaccinationUpdateRequest: {
        type: "object",
        description: "Partial vaccination update. Provide at least one field.",
        properties: {
          vaccineName: { type: "string", example: "Rabies" },
          dueDate: { type: "string", format: "date", example: "2026-09-01" },
          completedDate: { type: "string", format: "date", example: "2026-09-01" },
          nextDose: { type: "string", format: "date", example: "2027-09-01" },
          veterinarian: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f05" },
          notes: { type: "string", example: "Annual booster administered." }
        }
      },
      PetMedicalRecordRequest: {
        type: "object",
        required: ["petId", "diagnosis", "treatment"],
        properties: {
          petId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f04" },
          veterinarianId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f05" },
          diagnosis: { type: "string", example: "Otitis externa" },
          symptoms: { type: "array", items: { type: "string" }, example: ["Head shaking", "Ear odor"] },
          medications: { type: "array", items: { type: "object", additionalProperties: true } },
          prescriptions: { type: "array", items: { type: "object", additionalProperties: true } },
          treatment: { type: "string", example: "Ear cleaning and topical medication." },
          laboratoryReports: { type: "array", items: { type: "object", additionalProperties: true } },
          attachments: { type: "array", items: { type: "object", additionalProperties: true } },
          visitDate: { type: "string", format: "date-time" },
          followUpDate: { type: "string", format: "date-time" }
        }
      },
      PetMedicalRecordUpdateRequest: {
        type: "object",
        description: "Partial pet medical record update. Provide at least one field.",
        properties: {
          diagnosis: { type: "string", example: "Otitis externa improving" },
          symptoms: { type: "array", items: { type: "string" }, example: ["Head shaking"] },
          medications: { type: "array", items: { type: "object", additionalProperties: true } },
          prescriptions: { type: "array", items: { type: "object", additionalProperties: true } },
          treatment: { type: "string", example: "Continue topical medication for three more days." },
          laboratoryReports: { type: "array", items: { type: "object", additionalProperties: true } },
          attachments: { type: "array", items: { type: "object", additionalProperties: true } },
          visitDate: { type: "string", format: "date-time" },
          followUpDate: { type: "string", format: "date-time" }
        }
      },
      AiReportRequest: {
        type: "object",
        required: ["petId", "aiSummary", "severity"],
        description: "Preliminary assessment report only. This is not a diagnosis.",
        properties: {
          petId: { type: "string", example: "66aa7f0f0f0f0f0f0f0f0f04" },
          symptoms: { type: "array", items: { type: "string" }, example: ["Vomiting", "Low appetite"] },
          uploadedImages: { type: "array", items: { type: "string" } },
          aiSummary: { type: "string", example: "Preliminary assessment suggests monitoring hydration and clinical evaluation." },
          possibleConditions: { type: "array", items: { type: "string" }, example: ["Gastritis"] },
          severity: { type: "string", enum: ["low", "moderate", "high", "urgent"], example: "moderate" },
          recommendations: { type: "array", items: { type: "string" }, example: ["Book a veterinary visit"] },
          generatedAt: { type: "string", format: "date-time" }
        }
      }
    },
    responses: {
      Unauthorized: {
        description: "Missing, invalid, expired, or restricted authentication.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      Forbidden: {
        description:
          "Authenticated but not authorized for the required role, permission, organization, or ownership.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      NotFound: {
        description: "Resource not found or concealed by tenant/ownership rules.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      RateLimited: {
        description: "Rate limit exceeded.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      }
    }
  },
  paths: {
    "/health": { get: { tags: ["Health"], responses: { "200": { description: "API healthy" } } } },
    "/ready": {
      get: {
        tags: ["Health"],
        responses: {
          "200": { description: "API ready" },
          "503": { description: "Database not ready" }
        }
      }
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a patient account",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegistrationRequest" } }
          }
        },
        responses: {
          "201": { description: "Registration created pending email verification" },
          "409": { description: "Email already exists" },
          "429": { $ref: "#/components/responses/RateLimited" }
        }
      }
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with explicit account type",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/LoginRequest" },
                  {
                    type: "object",
                    required: ["accountType"],
                    properties: {
                      accountType: { type: "string", enum: ["patient", "doctor", "admin"] }
                    }
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": { description: "Access token plus refresh cookie issued" },
          "202": { description: "2FA challenge required; no normal tokens issued" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" }
        }
      }
    },
    "/api/v1/auth/patient/login": {
      post: {
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: {
          "200": { description: "Patient login" },
          "202": { description: "2FA required" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/doctor/login": {
      post: {
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: {
          "200": { description: "Doctor login" },
          "202": { description: "2FA required" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/admin/login": {
      post: {
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: {
          "200": { description: "Admin login" },
          "202": { description: "2FA required" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Authentication"],
        security: [{ refreshCookie: [] }],
        responses: {
          "200": { description: "Rotated refresh cookie and new access token" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Authentication"],
        security: [{ refreshCookie: [] }],
        responses: { "200": { description: "Current session revoked" } }
      }
    },
    "/api/v1/auth/logout-all": {
      post: {
        tags: ["Authentication"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "All sessions revoked" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/verify-email": {
      post: {
        tags: ["Authentication"],
        responses: {
          "200": { description: "Email verified" },
          "400": { description: "Invalid or expired token" }
        }
      }
    },
    "/api/v1/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        responses: { "200": { description: "Generic recovery response" } }
      }
    },
    "/api/v1/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        responses: {
          "200": { description: "Password reset" },
          "400": { description: "Invalid, expired, or weak reset" }
        }
      }
    },
    "/api/v1/auth/otp/request": {
      post: {
        tags: ["Authentication"],
        responses: {
          "200": { description: "OTP challenge requested" },
          "429": { $ref: "#/components/responses/RateLimited" }
        }
      }
    },
    "/api/v1/auth/otp/verify": {
      post: {
        tags: ["Authentication"],
        responses: { "200": { description: "OTP accepted" }, "400": { description: "Invalid OTP" } }
      }
    },
    "/api/v1/auth/2fa/login/verify": {
      post: {
        tags: ["TwoFactor"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/TwoFactorVerifyRequest" } }
          }
        },
        responses: {
          "200": { description: "Normal tokens issued after second factor" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/2fa/status": {
      get: {
        tags: ["TwoFactor"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "2FA status" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/2fa/setup/begin": {
      post: {
        tags: ["TwoFactor"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "TOTP setup URI and QR data URL" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/2fa/setup/confirm": {
      post: {
        tags: ["TwoFactor"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "2FA enabled and raw recovery codes displayed once" },
          "400": { description: "Invalid or expired setup" }
        }
      }
    },
    "/api/v1/auth/2fa/disable": {
      post: {
        tags: ["TwoFactor"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "2FA disabled and sessions revoked" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/2fa/recovery-codes/regenerate": {
      post: {
        tags: ["TwoFactor"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "New raw recovery codes displayed once" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/sessions": {
      get: {
        tags: ["Sessions"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Safe session metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        sessions: { type: "array", items: { $ref: "#/components/schemas/Session" } }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/auth/sessions/{sessionId}": {
      patch: {
        tags: ["Sessions"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Session renamed" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Sessions"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Session revoked" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/auth/sessions/revoke-others": {
      post: {
        tags: ["Sessions"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "All other sessions revoked" } }
      }
    },
    "/api/v1/auth/sessions/revoke-all": {
      post: {
        tags: ["Sessions"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "All sessions revoked" } }
      }
    },
    "/api/v1/authorization/me": {
      get: {
        tags: ["Authorization"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current role, permissions, and organization context" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/v1/authorization/roles": {
      get: {
        tags: ["Authorization"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Available roles and permissions" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/organizations/current": {
      get: {
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Current organization context" } }
      }
    },
    "/api/v1/organizations": {
      post: {
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Organization created by authorized super admin" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/organizations/{organizationId}/memberships": {
      get: {
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Tenant-scoped memberships" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      },
      put: {
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Membership created or changed" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/audit-logs": {
      get: {
        tags: ["Audit"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "eventType", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Tenant-scoped audit logs" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/veterinary/dashboard/stats": {
      get: {
        tags: ["Veterinary"],
        summary: "Veterinary dashboard statistics",
        description:
          "Returns scoped totals for pets, pet owners, veterinarians, vaccinations, AI reports, and recent pet medical records.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": veterinarySuccessResponse("Scoped veterinary statistics", "Veterinary dashboard statistics loaded", {
            stats: veterinaryStatsExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/veterinary/dashboard/summary": {
      get: {
        tags: ["Veterinary"],
        summary: "Veterinary dashboard summary",
        description:
          "Returns scoped dashboard totals, recent vaccinations, recent preliminary AI reports, and the preliminary assessment notice.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": veterinarySuccessResponse(
            "Scoped dashboard summary with recent veterinary activity",
            "Veterinary dashboard summary loaded",
            { summary: veterinarySummaryExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/veterinary/search/pets": {
      get: {
        tags: ["Veterinary"],
        summary: "Search pets",
        description:
          "Searches scoped pets with pagination plus owner, species, breed, age, and weight filters.",
        security: [{ bearerAuth: [] }],
        parameters: petFilterParameters,
        responses: {
          "200": veterinarySuccessResponse("Paginated scoped pet search results", "Pet search results loaded", {
            pets: [petExample],
            pagination: veterinaryPaginationExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/veterinary/search/pet-owners": {
      get: {
        tags: ["Veterinary"],
        summary: "Search pet owners",
        description: "Searches scoped pet owner profiles by owner fields or linked user.",
        security: [{ bearerAuth: [] }],
        parameters: [
          ...veterinaryListParameters("Sharma", "-createdAt"),
          { name: "userId", in: "query", schema: { type: "string" }, example: veterinaryIds.userId }
        ],
        responses: {
          "200": veterinarySuccessResponse(
            "Paginated scoped pet owner search results",
            "Pet owner search results loaded",
            { petOwners: [petOwnerExample], pagination: veterinaryPaginationExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/veterinary/search/veterinarians": {
      get: {
        tags: ["Veterinary"],
        summary: "Search veterinarians",
        description: "Searches veterinarian profiles by clinic, specialization, and license fields.",
        security: [{ bearerAuth: [] }],
        parameters: veterinaryListParameters("Dermatology", "clinicName"),
        responses: {
          "200": veterinarySuccessResponse(
            "Paginated veterinarian search results",
            "Veterinarian search results loaded",
            { veterinarians: [veterinarianExample], pagination: veterinaryPaginationExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/v1/veterinary/pet-owners": {
      post: {
        tags: ["Veterinary"],
        summary: "Create pet owner profile",
        description: "Creates a veterinary owner profile for the authenticated or supplied user.",
        security: [{ bearerAuth: [] }],
        requestBody: veterinaryRequestBody("PetOwnerRequest", petOwnerRequestExample),
        responses: {
          "201": veterinarySuccessResponse("Pet owner profile created", "Pet owner profile created", {
            petOwner: petOwnerExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { description: "Pet owner profile already exists" }
        }
      }
    },
    "/api/v1/veterinary/pet-owners/profile": {
      get: {
        tags: ["Veterinary"],
        summary: "Get pet owner profile",
        description: "Loads the current owner profile or a targeted owner profile by query.",
        security: [{ bearerAuth: [] }],
        parameters: veterinaryTargetParameters,
        responses: {
          "200": veterinarySuccessResponse("Pet owner profile", "Pet owner profile loaded", {
            petOwner: petOwnerExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      put: {
        tags: ["Veterinary"],
        summary: "Update pet owner profile",
        description: "Updates the current owner profile or a targeted owner profile by query.",
        security: [{ bearerAuth: [] }],
        parameters: veterinaryTargetParameters,
        requestBody: veterinaryRequestBody("PetOwnerUpdateRequest", {
          phone: "+91 9876543212",
          address: { line1: "24 Wellness Avenue", line2: "Bengaluru" },
          emergencyContact: "Aarav Sharma",
          emergencyPhone: "+91 9876543213"
        }),
        responses: {
          "200": veterinarySuccessResponse("Pet owner profile updated", "Pet owner profile updated", {
            petOwner: petOwnerExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Veterinary"],
        summary: "Delete pet owner profile",
        description: "Deletes a scoped pet owner profile when no pets remain attached.",
        security: [{ bearerAuth: [] }],
        parameters: veterinaryTargetParameters,
        responses: {
          "200": veterinarySuccessResponse("Pet owner profile deleted", "Pet owner profile deleted"),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { description: "Owner profile still has pets" }
        }
      }
    },
    "/api/v1/veterinary/pets": {
      get: {
        tags: ["Veterinary"],
        summary: "List and filter pets",
        description:
          "Lists scoped pets with pagination plus owner, species, breed, age, and weight filters.",
        security: [{ bearerAuth: [] }],
        parameters: petFilterParameters,
        responses: {
          "200": veterinarySuccessResponse("Paginated scoped pets", "Pets loaded", {
            pets: [petExample],
            pagination: veterinaryPaginationExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      },
      post: {
        tags: ["Veterinary"],
        summary: "Create pet",
        description: "Creates a pet profile for the authenticated or supplied pet owner.",
        security: [{ bearerAuth: [] }],
        requestBody: veterinaryRequestBody("PetRequest", petRequestExample),
        responses: {
          "201": veterinarySuccessResponse("Pet created", "Pet created", { pet: petExample }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { description: "Pet microchip number already exists" }
        }
      }
    },
    "/api/v1/veterinary/pets/{petId}": {
      get: {
        tags: ["Veterinary"],
        summary: "Get pet by ID",
        description: "Loads a scoped pet profile by pet ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("petId", veterinaryIds.petId)],
        responses: {
          "200": veterinarySuccessResponse("Pet", "Pet loaded", { pet: petExample }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      put: {
        tags: ["Veterinary"],
        summary: "Update pet",
        description: "Updates a scoped pet profile by pet ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("petId", veterinaryIds.petId)],
        requestBody: veterinaryRequestBody("PetUpdateRequest", {
          breed: "Labrador Retriever",
          weight: 29,
          vaccinationStatus: "booster_due"
        }),
        responses: {
          "200": veterinarySuccessResponse("Pet updated", "Pet updated", { pet: petExample }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Veterinary"],
        summary: "Delete pet",
        description: "Deletes a scoped pet and its veterinary child records.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("petId", veterinaryIds.petId)],
        responses: {
          "200": veterinarySuccessResponse("Pet and veterinary child records deleted", "Pet deleted"),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/veterinarians": {
      get: {
        tags: ["Veterinary"],
        summary: "List veterinarians",
        description: "Lists veterinarian profiles with pagination, search, and sorting.",
        security: [{ bearerAuth: [] }],
        parameters: veterinaryListParameters("small animal", "clinicName"),
        responses: {
          "200": veterinarySuccessResponse("Paginated veterinarians", "Veterinarians loaded", {
            veterinarians: [veterinarianExample],
            pagination: veterinaryPaginationExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      },
      post: {
        tags: ["Veterinary"],
        summary: "Create veterinarian profile",
        description: "Creates a veterinarian profile linked to a doctor account.",
        security: [{ bearerAuth: [] }],
        requestBody: veterinaryRequestBody("VeterinarianRequest", veterinarianRequestExample),
        responses: {
          "201": veterinarySuccessResponse(
            "Veterinarian profile created",
            "Veterinarian profile created",
            { veterinarian: veterinarianExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { description: "Veterinarian profile or license already exists" }
        }
      }
    },
    "/api/v1/veterinary/veterinarians/{veterinarianId}": {
      get: {
        tags: ["Veterinary"],
        summary: "Get veterinarian profile",
        description: "Loads a veterinarian profile by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("veterinarianId", veterinaryIds.veterinarianId)],
        responses: {
          "200": veterinarySuccessResponse("Veterinarian profile", "Veterinarian loaded", {
            veterinarian: veterinarianExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      put: {
        tags: ["Veterinary"],
        summary: "Update veterinarian profile",
        description: "Updates a veterinarian profile by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("veterinarianId", veterinaryIds.veterinarianId)],
        requestBody: veterinaryRequestBody("VeterinarianUpdateRequest", {
          specialization: ["Small animal medicine", "Emergency care"],
          clinicName: "VetFlow Advanced Care",
          yearsOfExperience: 9,
          consultationFee: 850
        }),
        responses: {
          "200": veterinarySuccessResponse(
            "Veterinarian profile updated",
            "Veterinarian profile updated",
            { veterinarian: veterinarianExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Veterinary"],
        summary: "Delete veterinarian profile",
        description: "Deletes a veterinarian profile by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("veterinarianId", veterinaryIds.veterinarianId)],
        responses: {
          "200": veterinarySuccessResponse(
            "Veterinarian profile deleted",
            "Veterinarian profile deleted"
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/vaccinations": {
      post: {
        tags: ["Veterinary"],
        summary: "Add vaccination",
        description: "Adds a vaccination record to a scoped pet.",
        security: [{ bearerAuth: [] }],
        requestBody: veterinaryRequestBody("VaccinationRequest", vaccinationRequestExample),
        responses: {
          "201": veterinarySuccessResponse("Vaccination added", "Vaccination added", {
            vaccination: vaccinationExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/vaccinations/{vaccinationId}": {
      patch: {
        tags: ["Veterinary"],
        summary: "Update vaccination",
        description: "Updates a scoped vaccination record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("vaccinationId", veterinaryIds.vaccinationId)],
        requestBody: veterinaryRequestBody("VaccinationUpdateRequest", {
          completedDate: "2026-09-01",
          nextDose: "2027-09-01",
          notes: "Annual booster administered."
        }),
        responses: {
          "200": veterinarySuccessResponse("Vaccination updated", "Vaccination updated", {
            vaccination: vaccinationExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Veterinary"],
        summary: "Delete vaccination",
        description: "Deletes a scoped vaccination record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("vaccinationId", veterinaryIds.vaccinationId)],
        responses: {
          "200": veterinarySuccessResponse("Vaccination deleted", "Vaccination deleted"),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/pets/{petId}/vaccinations": {
      get: {
        tags: ["Veterinary"],
        summary: "Get vaccinations by pet",
        description: "Lists vaccination records for a scoped pet with pagination and search.",
        security: [{ bearerAuth: [] }],
        parameters: [
          veterinaryPathParameter("petId", veterinaryIds.petId),
          ...veterinaryListParameters("Rabies", "dueDate")
        ],
        responses: {
          "200": veterinarySuccessResponse("Paginated vaccinations for pet", "Vaccinations loaded", {
            vaccinations: [vaccinationExample],
            pagination: veterinaryPaginationExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/pet-medical-records": {
      post: {
        tags: ["Veterinary"],
        summary: "Create pet medical record",
        description: "Creates a clinical veterinary medical record for a scoped pet.",
        security: [{ bearerAuth: [] }],
        requestBody: veterinaryRequestBody(
          "PetMedicalRecordRequest",
          petMedicalRecordRequestExample
        ),
        responses: {
          "201": veterinarySuccessResponse(
            "Pet medical record created",
            "Pet medical record created",
            { record: petMedicalRecordExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/pets/{petId}/medical-records": {
      get: {
        tags: ["Veterinary"],
        summary: "Get pet medical history",
        description: "Lists clinical veterinary medical records for a scoped pet.",
        security: [{ bearerAuth: [] }],
        parameters: [
          veterinaryPathParameter("petId", veterinaryIds.petId),
          ...veterinaryListParameters("otitis", "-visitDate")
        ],
        responses: {
          "200": veterinarySuccessResponse(
            "Paginated pet medical records",
            "Pet medical history loaded",
            { records: [petMedicalRecordExample], pagination: veterinaryPaginationExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/pet-medical-records/{recordId}": {
      get: {
        tags: ["Veterinary"],
        summary: "Get pet medical record",
        description: "Loads a scoped veterinary medical record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("recordId", veterinaryIds.recordId)],
        responses: {
          "200": veterinarySuccessResponse("Pet medical record", "Pet medical record loaded", {
            record: petMedicalRecordExample
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      patch: {
        tags: ["Veterinary"],
        summary: "Update pet medical record",
        description: "Updates a scoped veterinary medical record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("recordId", veterinaryIds.recordId)],
        requestBody: veterinaryRequestBody("PetMedicalRecordUpdateRequest", {
          diagnosis: "Otitis externa improving",
          treatment: "Continue topical medication for three more days.",
          followUpDate: "2026-08-18T09:20:00.000Z"
        }),
        responses: {
          "200": veterinarySuccessResponse(
            "Pet medical record updated",
            "Pet medical record updated",
            { record: petMedicalRecordExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Veterinary"],
        summary: "Delete pet medical record",
        description: "Deletes a scoped veterinary medical record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("recordId", veterinaryIds.recordId)],
        responses: {
          "200": veterinarySuccessResponse("Pet medical record deleted", "Pet medical record deleted"),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/ai-reports": {
      get: {
        tags: ["Veterinary"],
        summary: "List preliminary assessment reports",
        description: "AI reports are preliminary assessment reports only and are not diagnoses.",
        security: [{ bearerAuth: [] }],
        parameters: [
          ...veterinaryListParameters("vomiting", "-generatedAt"),
          { name: "petId", in: "query", schema: { type: "string" }, example: veterinaryIds.petId }
        ],
        responses: {
          "200": veterinarySuccessResponse(
            "Paginated preliminary assessment reports",
            "Preliminary assessment reports loaded",
            { reports: [aiReportExample], pagination: veterinaryPaginationExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      },
      post: {
        tags: ["Veterinary"],
        summary: "Create preliminary assessment report",
        description: "Creates an AI preliminary assessment report. This is not a diagnosis.",
        security: [{ bearerAuth: [] }],
        requestBody: veterinaryRequestBody("AiReportRequest", aiReportRequestExample),
        responses: {
          "201": veterinarySuccessResponse(
            "Preliminary assessment report created",
            "Preliminary assessment report created",
            { report: aiReportExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/v1/veterinary/ai-reports/{reportId}": {
      get: {
        tags: ["Veterinary"],
        summary: "Get preliminary assessment report",
        description: "Loads a scoped preliminary assessment report by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("reportId", veterinaryIds.reportId)],
        responses: {
          "200": veterinarySuccessResponse(
            "Preliminary assessment report",
            "Preliminary assessment report loaded",
            { report: aiReportExample }
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      },
      delete: {
        tags: ["Veterinary"],
        summary: "Delete preliminary assessment report",
        description: "Deletes a scoped preliminary assessment report by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [veterinaryPathParameter("reportId", veterinaryIds.reportId)],
        responses: {
          "200": veterinarySuccessResponse(
            "Preliminary assessment report deleted",
            "Preliminary assessment report deleted"
          ),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/user/get-profile": {
      get: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: {
          "200": { description: "Patient profile" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/api/user/health-profile": {
      get: {
        tags: ["Users"],
        summary: "Read the authenticated patient's private health profile",
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: { "200": { description: "Private patient-owned health profile" } }
      },
      put: {
        tags: ["Users"],
        summary: "Update the authenticated patient's private health profile",
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/HealthProfile" } } }
        },
        responses: {
          "200": { description: "Health profile updated and audited" },
          "400": { description: "Health profile validation failed" }
        }
      }
    },
    "/api/user/book-appointment": {
      post: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: {
          "200": { description: "Appointment booked" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/user/appointments": {
      get: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: { "200": { description: "Patient appointments" } }
      }
    },
    "/api/user/cancel-appointment": {
      post: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: {
          "200": { description: "Appointment cancelled" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/user/payment-razorpay": {
      post: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: { "200": { description: "Razorpay order created" } }
      }
    },
    "/api/user/verifyRazorpay": {
      post: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: { "200": { description: "Razorpay payment verified" } }
      }
    },
    "/api/user/payment-stripe": {
      post: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: { "200": { description: "Stripe checkout session created" } }
      }
    },
    "/api/user/verifyStripe": {
      post: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }, { legacyPatientToken: [] }],
        responses: { "200": { description: "Stripe checkout session verified" } }
      }
    },
    "/api/doctor/list": {
      get: { tags: ["Doctors"], responses: { "200": { description: "Public doctor list" } } }
    },
    "/api/doctor/{doctorId}/available-slots": {
      get: {
        tags: ["Doctors"],
        summary: "List persisted, unbooked doctor slots",
        parameters: [
          { name: "doctorId", in: "path", required: true, schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 31 } }
        ],
        responses: { "200": { description: "Available local-date slots and timezone metadata" } }
      }
    },
    "/api/doctor/availability": {
      get: {
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        responses: { "200": { description: "Authenticated doctor's schedule" } }
      },
      put: {
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/DoctorAvailability" } }
          }
        },
        responses: { "200": { description: "Own schedule updated and audited" } }
      }
    },
    "/api/doctor/appointments/{appointmentId}/clinical-notes": {
      patch: {
        tags: ["Doctors"],
        summary: "Update private notes for an assigned appointment",
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        parameters: [
          { name: "appointmentId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Clinical notes saved and audited" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/doctor/appointments": {
      get: {
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        responses: {
          "200": { description: "Doctor appointments" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/doctor/dashboard": {
      get: {
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        responses: { "200": { description: "Doctor dashboard" } }
      }
    },
    "/api/doctor/profile": {
      get: {
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        responses: { "200": { description: "Doctor profile" } }
      }
    },
    "/api/doctor/update-profile": {
      post: {
        tags: ["Doctors"],
        security: [{ bearerAuth: [] }, { legacyDoctorToken: [] }],
        responses: { "200": { description: "Doctor profile updated" } }
      }
    },
    "/api/admin/dashboard": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        responses: {
          "200": { description: "Admin dashboard" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/admin/add-doctor": {
      post: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        responses: {
          "201": { description: "Doctor created" },
          "403": { $ref: "#/components/responses/Forbidden" }
        }
      }
    },
    "/api/admin/all-doctors": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        responses: { "200": { description: "Doctors for admin" } }
      }
    },
    "/api/admin/appointments": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        responses: { "200": { description: "Appointments for admin" } }
      }
    },
    "/api/admin/patients": {
      get: {
        tags: ["Admin"],
        summary: "Tenant-scoped safe patient directory",
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "Safe patient summaries without health fields" } }
      }
    },
    "/api/admin/patients/{patientId}/appointments": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        parameters: [
          { name: "patientId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Tenant-scoped patient appointment history" },
          "404": { $ref: "#/components/responses/NotFound" }
        }
      }
    },
    "/api/admin/appointments/{appointmentId}/status": {
      patch: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        responses: { "200": { description: "Appointment status updated and audited" } }
      }
    },
    "/api/admin/appointments/{appointmentId}/clinical-notes": {
      get: {
        tags: ["Admin"],
        summary: "Read private clinical notes with explicit update permission",
        security: [{ bearerAuth: [] }, { legacyAdminToken: [] }],
        responses: { "200": { description: "Private clinical notes" } }
      }
    }
  }
} as const;
