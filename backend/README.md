# MedFlow Backend

This backend uses the TypeScript Express architecture established in Phase 1A and the enterprise authentication foundation added in Phase 1B.

## Architecture

```text
src/
  config/       validated environment, database, Cloudinary, payment clients
  controllers/  HTTP request/response adapters
  middleware/   security, auth, validation, uploads, errors
  models/       typed Mongoose schemas
  routes/       endpoint registration
  services/     business logic and ownership checks
  types/        shared domain and Express types
  validators/   Zod schemas
  app.ts        Express app without network side effects
  server.ts     runtime startup and graceful shutdown
tests/          isolated Vitest/Supertest tests
```

Phase 1B authentication is split by responsibility:

- `routes/authRoutes.ts`: `/api/v1/auth` endpoint definitions
- `controllers/authController.ts`: HTTP input/output, cookies, and safe response shape
- `services/authService.ts`: registration, login, refresh, logout, verification, recovery, and OTP business flows
- `services/accountService.ts`: unified patient, doctor, and env-backed admin account adapter
- `services/authSessionService.ts`: refresh-token sessions, rotation, family revocation, and reuse detection
- `services/authChallengeService.ts`: token/OTP challenge creation, cooldowns, attempts, consumption, and revocation
- `services/emailService.ts`: SMTP delivery abstraction and safe development/test outbox
- `services/tokenService.ts`: access/refresh JWT signing and verification
- `models/AuthSession.ts` and `models/AuthChallenge.ts`: persistence foundation for refresh tokens and challenges

Phase 1C authorization and security adds:

- `constants/rbac.ts`: enterprise roles, permissions, and role-permission matrix
- `models/Organization.ts` and `models/OrganizationMembership.ts`: organization foundation and membership lifecycle
- `models/AuthSecurity.ts`: encrypted TOTP secret state and hashed recovery-code records
- `models/AuditLog.ts`: append-oriented security audit events
- `services/organizationService.ts`: authorization context, default organization, membership management, and role safety checks
- `services/twoFactorService.ts`: `otplib` TOTP setup, `qrcode` setup QR data, login challenges, recovery-code lifecycle, and 2FA session revocation
- `services/auditService.ts`: safe audit metadata redaction and tenant-scoped audit queries

Phase 1D platform operations adds:

- `utils/logger.ts`: Pino structured logging with recursive sensitive-value redaction
- `middleware/requestLogging.ts`: generated/propagated `x-request-id` and HTTP request logging
- `openapi/document.ts` and `openapi/routes.ts`: OpenAPI 3.0 JSON and controlled Swagger UI

## Environment

Copy `.env.example` to `.env` and provide local values. The database name must be part of `MONGODB_URI`; the backend no longer appends `/prescripto`.

Never commit real secrets.

Phase 1B auth variables:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: separate secrets for access and refresh tokens. Production requires both and they must differ.
- `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`: examples are `15m` and `30d`.
- `JWT_ISSUER`, `JWT_AUDIENCE`: validated on signed tokens.
- `COOKIE_NAME`, `COOKIE_SAME_SITE`: refresh-token cookie name and SameSite mode.
- `EMAIL_VERIFICATION_EXPIRES_IN`, `PASSWORD_RESET_EXPIRES_IN`, `OTP_EXPIRES_IN`, `OTP_MAX_ATTEMPTS`: challenge lifetime and brute-force limits.
- `AUTH_LOCK_MAX_ATTEMPTS`, `AUTH_LOCK_DURATION`: temporary lockout after repeated failed login.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`: production SMTP delivery.
- `CLIENT_URL`, `ADMIN_URL`: CORS allowlist and auth-origin checks.
- `TWO_FACTOR_ENCRYPTION_KEY`: strong dedicated 32+ byte secret for AES-256-GCM TOTP secret encryption. Production requires it.
- `TOTP_ISSUER`, `TOTP_SETUP_EXPIRES_IN`, `TWO_FACTOR_CHALLENGE_EXPIRES_IN`, `TWO_FACTOR_MAX_ATTEMPTS`, `RECOVERY_CODE_COUNT`: authenticator-app 2FA, challenge, and recovery-code settings.
- `DEFAULT_ORGANIZATION_NAME`, `DEFAULT_ORGANIZATION_SLUG`: default organization used by the safe migration/backfill foundation.
- `LOG_LEVEL`, `SERVICE_NAME`: structured logger configuration.
- `ENABLE_API_DOCS`: enables `/api-docs` outside development. `/api-docs.json` remains available for trusted tooling.
- `DEVELOPMENT_AUTO_VERIFY_EMAIL`: optional local-development bypass. Set to exactly `true` only outside production to mark newly registered patient accounts as verified immediately and skip verification email delivery. Production never honors this bypass.

`JWT_SECRET` remains as a transitional legacy-token secret and fallback in non-production. New production deployments should use distinct access and refresh secrets.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run start
```

`npm run start` runs compiled JavaScript from `dist/server.js`.

## Security Foundation

- Helmet headers
- CORS restricted to `CLIENT_URL` and `ADMIN_URL`
- General and auth rate limits
- Registration, refresh, verification, password-reset, and OTP rate limits
- JSON and URL-encoded body limits
- Image MIME and size validation
- JWT expiry, issuer, audience, and token-type validation
- Short-lived access tokens
- Refresh tokens stored only in HttpOnly cookies
- Refresh-token rotation after every successful refresh
- Refresh-token reuse detection with token-family revocation
- Authentication sessions with hashed current refresh tokens
- Account statuses, email verification flags, failed attempts, lockout, password-change invalidation, and login tracking
- Email verification and password-reset token hashes only
- OTP hashes only, purpose binding, max attempts, resend cooldowns, and one-time consumption
- Origin protection for cookie-authenticated auth endpoints
- `Authorization: Bearer <token>` support
- Legacy `token`, `aToken`, and `dToken` support retained for current clients
- Sensitive fields removed from API responses
- Duplicate email errors returned as safe conflict responses
- Centralized enterprise roles and permissions
- Tenant membership validation before protected organization access
- Authenticator-app TOTP through maintained `otplib` with encrypted secrets
- QR setup PNG data URLs through maintained `qrcode`
- Single-use recovery codes stored only as HMAC hashes
- Short-lived purpose-bound 2FA challenge JWTs that cannot authorize protected APIs
- Session-management APIs returning only safe session metadata
- Structured audit logs with secret metadata redaction
- Tenant-scoped audit reads requiring `audit:read`

## Authentication Flows

Registration:

1. Public registration accepts only patient accounts.
2. Email is normalized and checked across patient, doctor, and admin identities.
3. Password policy requires at least 12 characters with uppercase, lowercase, number, and symbol.
4. The patient is created as `PENDING_VERIFICATION` and `emailVerified=false`.
5. A single-use verification challenge is stored as a hash and delivered by email.
6. The response does not include a refresh token, raw verification token, OTP, or password hash.

Local development can set `DEVELOPMENT_AUTO_VERIFY_EMAIL=true` to create new patient accounts as already verified and avoid SMTP setup. The bypass activates only when `NODE_ENV` is not `production`; production registration always keeps new accounts pending email verification.

Login:

1. Email is normalized and invalid credential failures use generic messages.
2. Passwords are compared with bcrypt.
3. Account status, verification policy, lockout, and failed attempts are enforced.
4. A short-lived access token is returned and a long-lived refresh token is placed in a secure HttpOnly cookie.
5. Existing patient, doctor, and admin login paths still return top-level `token` for compatibility.

Refresh:

1. `POST /api/v1/auth/refresh` reads the refresh cookie.
2. The refresh JWT must use the refresh secret and `tokenType=refresh`.
3. The session must be current, unexpired, and unrevoked, and its stored hash must match the presented token.
4. A new refresh token is issued and the old hash is atomically replaced.
5. Reuse of a rotated/revoked token revokes the token family.

Logout:

- `POST /api/v1/auth/logout` revokes the current refresh session when a refresh cookie is present and clears the cookie.
- `POST /api/v1/auth/logout-all` requires an access token and revokes all sessions for that account.
- Password reset also revokes all sessions for the account.

Email verification, recovery, and OTP:

- Verification and reset tokens are cryptographically random; only HMAC hashes are stored.
- Forgot-password returns the same generic response whether or not an account exists.
- Reset rejects expired, used, invalid, weak, or reused-password challenges.
- OTP challenges support `EMAIL_VERIFICATION`, `PASSWORD_RESET`, and `LOGIN_VERIFICATION`.

## Phase 1C Authorization, 2FA, And Sessions

Roles are centralized as `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `STAFF`, and `PATIENT`. Public registration creates only `PATIENT`. The configured admin compatibility account maps to `HOSPITAL_ADMIN`; no public or automatic backfill path grants `SUPER_ADMIN`.

Permissions include `users:*`, `doctors:*`, `appointments:*`, `reports:read`, `billing:*`, `sessions:*`, `audit:read`, `roles:*`, `organization:*`, and `settings:manage`. A valid login authenticates identity only; route authorization still requires server-resolved role, permission, organization, and ownership checks.

Tenant rules:

- Organization identity comes from authenticated membership resolved server-side.
- Request body/header `organizationId` values are not trusted for protected actions.
- Patients remain limited to owned resources.
- Doctors remain limited to their own appointments/profile plus organization scope.
- Hospital admins are limited to their organization.
- `SUPER_ADMIN` is reserved for explicitly bootstrapped future administrative operations.
- Existing unscoped records are supported only through documented default-organization migration fallback and do not bypass ownership checks.

2FA setup generates an authenticator-app TOTP secret with maintained `otplib`, returns standards-compliant `otpauth://` setup data plus PNG QR data from maintained `qrcode`, stores only AES-256-GCM encrypted pending/confirmed state, expires setup challenges, limits attempts, and enables 2FA only after a valid TOTP confirmation. Recovery codes are displayed once, stored only as hashes, and consumed one time.

2FA login verifies primary credentials first, returns only a short-lived restricted `two_factor_challenge` token for enabled accounts, and creates normal access/refresh tokens only after valid TOTP or unused recovery-code verification.

Session APIs:

- `GET /api/v1/auth/sessions`
- `PATCH /api/v1/auth/sessions/:sessionId`
- `DELETE /api/v1/auth/sessions/:sessionId`
- `POST /api/v1/auth/sessions/revoke-others`
- `POST /api/v1/auth/sessions/revoke-all`

Returned session fields are limited to session ID, display/device metadata, approximate IP, timestamps, expiration, and current-session indicator. Refresh tokens, hashes, cookies, and fingerprints are never returned.

## Migration and Backfill

The schema adds auth metadata to existing patient and doctor documents. Run the idempotent backfill only against an intended environment:

```bash
cd backend
npx tsx src/scripts/backfillAuthAccounts.ts
```

The script:

- Sets missing `normalizedEmail` values from existing email fields.
- Sets missing `emailVerified`, `accountStatus`, `failedLoginAttempts`, and `authenticationProvider` defaults.
- Reports duplicate normalized emails before any unique-index work.
- Does not assign privileged roles.
- Does not delete, lock, or overwrite legitimate accounts.
- Does not run automatically during server startup.

Review duplicate reports before adding any future unique normalized-email indexes.

Phase 1C backfill:

```bash
cd backend
npx tsx src/scripts/backfillPhase1C.ts
```

This script creates/reuses the default organization, maps existing users to `PATIENT`, doctors to `DOCTOR`, configured admin compatibility to `HOSPITAL_ADMIN`, creates missing memberships, associates missing organization IDs, initializes disabled 2FA security records, and reports duplicate active membership conflicts. It does not create `SUPER_ADMIN`, delete records, contact external services, or run automatically during startup.

## Local Phase 2C Demo Seed

The Phase 2C demo seed is fictional local-development data only. It never runs automatically and refuses to run unless `NODE_ENV=development` and `ALLOW_PHASE2C_DEMO_SEED=true`.

It creates only records tagged with `demoSeedKey` values beginning with `phase2c-demo:` and visible labels/text containing `Demo data`. Existing tagged records are skipped, and existing non-demo records are never overwritten or deleted.

To run it against your local development database:

```powershell
cd backend
$env:ALLOW_PHASE2C_DEMO_SEED = "true"
npm run seed:phase2c-demo
Remove-Item Env:\ALLOW_PHASE2C_DEMO_SEED
```

For bash-compatible shells:

```bash
cd backend
ALLOW_PHASE2C_DEMO_SEED=true npm run seed:phase2c-demo
```

The demo login password printed by the command is fictional and intended only for local development. Do not enable this seed guard for shared, staging, or production databases.

The script currently inserts:

- 3 fictional demo patients
- 2 fictional demo doctors with availability
- completed and upcoming demo appointments
- finalized demo timeline records, vaccination entries, and prescription examples
- demo family-member/contact examples

Safe local reset:

1. Confirm the database is your disposable local development database.
2. Delete only records tagged with `demoSeedKey: /^phase2c-demo:/`.
3. Delete organization memberships only for the tagged demo account IDs.
4. Re-run `npm run seed:phase2c-demo` with the same explicit guard if you want fresh demo data.

Example `mongosh` reset for a local development database only:

```javascript
const demoKey = /^phase2c-demo:/;
const demoUserIds = db.users.find({ demoSeedKey: demoKey }, { _id: 1 }).toArray().map((doc) => String(doc._id));
const demoDoctorIds = db.doctors.find({ demoSeedKey: demoKey }, { _id: 1 }).toArray().map((doc) => String(doc._id));

db.appointments.deleteMany({ demoSeedKey: demoKey });
db.medical_records.deleteMany({ demoSeedKey: demoKey });
db.family_members.deleteMany({ demoSeedKey: demoKey });
db.organization_memberships.deleteMany({
  $or: [
    { accountType: "patient", accountId: { $in: demoUserIds } },
    { accountType: "doctor", accountId: { $in: demoDoctorIds } }
  ]
});
db.users.deleteMany({ demoSeedKey: demoKey });
db.doctors.deleteMany({ demoSeedKey: demoKey });
```

## Payment Notes

Razorpay verification validates the server-side signature and checks appointment ownership.

Stripe checkout now includes a server-created `session_id`. `/api/user/verifyStripe` verifies the Stripe session before marking an appointment as paid. Webhook-based reconciliation remains future work.

## Testing

Tests mock persistence and external providers. They do not connect to production MongoDB, Stripe, Razorpay, or Cloudinary.

Covered areas include:

- Health and readiness
- Secure registration and login validation
- Duplicate email handling
- Privileged-role injection protection
- Unverified, suspended, and locked login behavior
- Access-token validation, wrong token type, and password-change invalidation
- Refresh rotation, old-token invalidation, reuse detection, logout, and logout-all
- Email verification, used-token rejection, password recovery, session revocation, and OTP purpose binding
- RBAC denial for patient/admin/audit access
- Hospital-admin super-admin operation denial and self-role escalation prevention
- Cross-organization appointment denial despite forged organization input
- Maintained TOTP behavior, setup expiry, PNG QR output, invalid setup confirmation, valid setup confirmation, encrypted secret persistence, hashed recovery-code persistence, 2FA login challenge, invalid TOTP, valid TOTP, challenge replay denial, recovery-code success, and recovery-code reuse denial
- Session listing, current-session identification, revoke-other-sessions, selected-session revocation, and revoked refresh-token rejection
- Tenant-scoped audit access and secret non-persistence checks
- Missing and invalid auth tokens
- Protected route access
- Invalid ObjectId handling
- Appointment ownership
- Payment ownership
- 404 responses
- Global error responses

## Container Runtime

`backend/Dockerfile` builds the TypeScript API in a multi-stage Node 22 Alpine image and runs compiled output only. Use the root [deployment guide](../docs/deployment.md) for the local Compose workflow. Production deployments must provide actual validated environment values, approved origins, external TLS, a managed database, and secret management; no production infrastructure is implied by the local Compose file.
