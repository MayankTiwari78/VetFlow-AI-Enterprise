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
    { name: "Payments" }
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
      AppointmentStatus: { type: "string", enum: ["scheduled", "completed", "cancelled"] }
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
