# MedFlow AI – Intelligent Healthcare SaaS Platform

Developed and maintained by **Mayank Tiwari**.

MedFlow AI is a healthcare SaaS platform with separate patient, doctor, and admin web clients backed by an Express API.

## Phase 1A Through 1D Status

Phase 1A establishes the enterprise backend foundation:

- TypeScript backend source under `backend/src`
- Strict TypeScript checking and production compilation
- Centralized, validated environment configuration
- Typed Mongoose models preserving existing MongoDB field names
- Helmet, CORS allowlist, rate limiting, body limits, secure image upload validation
- JWT expiry with `Authorization: Bearer <token>` support
- Compatibility with legacy `token`, `aToken`, and `dToken` headers
- Central async error handling, application errors, 404 handling, health/readiness endpoints
- Zod validation for authentication, profiles, doctors, appointments, and payments
- Ownership checks for patient appointments, doctor appointments, and payment initialization
- Test suite that avoids real MongoDB, Cloudinary, Razorpay, and Stripe connections

Phase 1B adds enterprise authentication foundations:

- Unified auth service/controller/router architecture under `backend/src`
- Secure patient-only public registration with normalized emails and verification defaults
- Short-lived JWT access tokens with issuer, audience, token-type, and password-change checks
- Long-lived refresh tokens in secure HttpOnly cookies with rotation and reuse detection
- Authentication sessions with hashed refresh tokens, token families, revocation, activity, and TTL cleanup
- Email verification, resend verification, forgot password, reset password, and OTP challenges
- Development/test email outbox and production SMTP abstraction without logging secrets or raw tokens
- Auth-specific rate limits and origin checks for cookie-authenticated auth actions
- Legacy `/api/user`, `/api/doctor`, and `/api/admin` login compatibility with deprecated legacy headers
- Frontend/admin Axios compatibility for credentialed refresh-cookie support and one retry after 401

Phase 1C adds enterprise authorization and account-security foundations:

- Central enterprise roles: `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `STAFF`, and `PATIENT`
- Central permission mapping for users, doctors, appointments, reports, billing, sessions, audit logs, roles, organizations, and settings
- Server-side authorization middleware for role checks, permission checks, organization membership, tenant scope, and ownership-or-permission access
- Organization and membership models with active-membership uniqueness and membership lifecycle statuses
- Tenant-scoped authorization for new writes and protected compatibility paths, with migration fallback for existing unscoped records
- Authenticator-app TOTP setup through maintained `otplib`, QR setup data through maintained `qrcode`, encrypted TOTP secret storage, short-lived 2FA login challenge tokens, and one-time hashed recovery codes
- Session-management APIs for listing, renaming, revoking selected sessions, revoking other sessions, and revoking all sessions
- Structured persistent audit logs with tenant-scoped query APIs requiring `audit:read`
- Admin membership-management and audit-log screens; patient/admin/doctor security and active-session screens
- Idempotent Phase 1C backfill script for roles, default organization, memberships, organization associations, auth-security defaults, and indexes

Phase 1D completes the platform hardening and delivery baseline:

- Pino JSON logging with request IDs and sensitive-value redaction
- OpenAPI 3.0 JSON at `/api-docs.json` and environment-gated Swagger UI at `/api-docs`
- Patient and admin/doctor clients migrated from Vite/React Router to Next.js App Router with TypeScript checks, preserved route maps, browser-safe token initialization, and standalone production output
- Dockerfiles for the API and both Next.js clients, plus a local Docker Compose stack

## Project Structure

```text
admin/      Next.js admin and doctor portal
backend/    TypeScript Express API
frontend/   Next.js patient app
docs/       local deployment guidance
```

Backend structure:

```text
backend/src/
  config/       environment, MongoDB, Cloudinary, payment clients
  controllers/  HTTP controllers
  middleware/   auth, validation, errors, uploads, security
  models/       typed Mongoose models
  routes/       API route definitions
  services/     business logic
  types/        shared TypeScript types
  validators/   Zod request schemas
  app.ts        Express app
  server.ts     runtime entrypoint
backend/tests/  Vitest/Supertest coverage
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Fill `backend/.env` with real local credentials. Do not commit `.env`.

Required backend environment variables:

- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `CLIENT_URL`
- `ADMIN_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_SECRET_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `STRIPE_SECRET_KEY`
- `CURRENCY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_VERIFICATION_EXPIRES_IN`
- `PASSWORD_RESET_EXPIRES_IN`
- `OTP_EXPIRES_IN`
- `OTP_MAX_ATTEMPTS`
- `AUTH_LOCK_MAX_ATTEMPTS`
- `AUTH_LOCK_DURATION`
- `COOKIE_NAME`
- `COOKIE_SAME_SITE`
- `TWO_FACTOR_ENCRYPTION_KEY`
- `TOTP_ISSUER`
- `TOTP_SETUP_EXPIRES_IN`
- `TWO_FACTOR_CHALLENGE_EXPIRES_IN`
- `TWO_FACTOR_MAX_ATTEMPTS`
- `RECOVERY_CODE_COUNT`
- `DEFAULT_ORGANIZATION_NAME`
- `DEFAULT_ORGANIZATION_SLUG`

## Backend Commands

```bash
npm run dev        # tsx development server
npm run build      # clean and compile to dist/
npm run start      # run compiled JavaScript
npm run typecheck  # strict TypeScript check
npm run lint       # ESLint
npm run format     # Prettier
npm run test       # Vitest/Supertest
```

## Client Commands

Both `frontend/` and `admin/` use Next.js App Router and provide the same scripts:

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run start
```

Patient app routes preserve appointment, profile, payment, verification, OTP, 2FA, and session-security flows. The portal preserves administrator, doctor, RBAC, membership, audit-log, 2FA, and session-security routes. Existing API authorization remains server-enforced.

## Observability And API Docs

The API emits structured Pino logs with an `x-request-id` for each request and redacts passwords, authorization values, tokens, OTPs, recovery codes, cookies, encryption keys, payment data, and SMTP settings. OpenAPI JSON is served at `/api-docs.json`; Swagger UI at `/api-docs` is enabled only in development or when `ENABLE_API_DOCS=true`.

## Docker

Local Compose guidance is available in [docs/deployment.md](./docs/deployment.md). The stack is local-only and uses placeholders in the root `.env.example`; do not commit a real `.env` or use the development Compose defaults for production.

## API Overview

Existing public API paths are preserved:

- `POST /api/user/register`
- `POST /api/user/login`
- `GET /api/user/get-profile`
- `POST /api/user/update-profile`
- `POST /api/user/book-appointment`
- `GET /api/user/appointments`
- `POST /api/user/cancel-appointment`
- `POST /api/user/payment-razorpay`
- `POST /api/user/verifyRazorpay`
- `POST /api/user/payment-stripe`
- `POST /api/user/verifyStripe`
- `POST /api/admin/login`
- `POST /api/admin/add-doctor`
- `GET /api/admin/appointments`
- `POST /api/admin/cancel-appointment`
- `GET /api/admin/all-doctors`
- `POST /api/admin/change-availability`
- `GET /api/admin/dashboard`
- `POST /api/doctor/login`
- `GET /api/doctor/list`
- `GET /api/doctor/appointments`
- `POST /api/doctor/cancel-appointment`
- `POST /api/doctor/complete-appointment`
- `POST /api/doctor/change-availability`
- `GET /api/doctor/dashboard`
- `GET /api/doctor/profile`
- `POST /api/doctor/update-profile`

Phase 1B auth API:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/patient/login`
- `POST /api/v1/auth/doctor/login`
- `POST /api/v1/auth/admin/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/verify-email?token=...`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`

Phase 1C security and authorization API:

- `POST /api/v1/auth/2fa/login/verify`
- `GET /api/v1/auth/2fa/status`
- `POST /api/v1/auth/2fa/setup/begin`
- `POST /api/v1/auth/2fa/setup/confirm`
- `POST /api/v1/auth/2fa/disable`
- `POST /api/v1/auth/2fa/recovery-codes/regenerate`
- `GET /api/v1/auth/sessions`
- `PATCH /api/v1/auth/sessions/:sessionId`
- `DELETE /api/v1/auth/sessions/:sessionId`
- `POST /api/v1/auth/sessions/revoke-others`
- `POST /api/v1/auth/sessions/revoke-all`
- `GET /api/v1/authorization/me`
- `GET /api/v1/authorization/roles`
- `GET /api/v1/organizations/current`
- `POST /api/v1/organizations`
- `GET /api/v1/organizations/:organizationId/memberships`
- `PUT /api/v1/organizations/:organizationId/memberships`
- `GET /api/v1/audit-logs`

Health checks:

- `GET /health`
- `GET /ready`
- `GET /api/health`
- `GET /api/ready`

## Compatibility Notes

The backend returns the new `success`, `message`, and `data` response shape while also preserving legacy top-level fields used by the current React clients, such as `token`, `doctors`, `appointments`, `userData`, `profileData`, `dashData`, `order`, and `session_url`.

Legacy auth headers `token`, `aToken`, and `dToken` still work but are deprecated. New access-token clients should use `Authorization: Bearer <access-token>`. Refresh tokens are not returned in JSON and are stored only in the configured HttpOnly cookie.

Stripe verification now requires the backend-created Checkout Session id. The frontend verify page sends `session_id` back to `/api/user/verifyStripe`; the backend no longer marks payments as successful based only on a frontend `success=true` value.

## Phase 1C Migration

Run the Phase 1C backfill explicitly after reviewing the target environment:

```bash
cd backend
npx tsx src/scripts/backfillPhase1C.ts
```

The script is idempotent. It creates or reuses the configured default organization, maps existing users to `PATIENT`, doctors to `DOCTOR`, the configured admin compatibility account to `HOSPITAL_ADMIN`, creates missing active memberships, fills missing organization IDs, creates disabled 2FA security records, and reports membership conflicts. It never creates `SUPER_ADMIN`, deletes accounts, or rewrites medical/payment data.

## Out Of Scope

The Phase 1D delivery baseline intentionally does not implement complete multi-tenancy, full SaaS billing/subscriptions, AI healthcare features, video consultation, medical-report AI, production cloud infrastructure, Kubernetes, or a production reverse-proxy/TLS deployment. Docker Compose is provided for safe local verification only.

## Developer

Mayank Tiwari

Third-party open-source notices are available in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

GitHub: https://github.com/MayankTiwari78
