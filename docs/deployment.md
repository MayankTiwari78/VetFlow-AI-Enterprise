# Local Docker Deployment

The Compose configuration starts a local MongoDB instance, the TypeScript Express API, the patient Next.js app, and the admin/doctor Next.js portal. It is intended for local development and verification, not production cloud deployment.

1. Copy the root `.env.example` to `.env` and replace every placeholder with safe local values.
2. Start the stack with `docker compose up --build`.
3. Open the patient app at `http://localhost:3000`, the portal at `http://localhost:3001`, and the API health endpoint at `http://localhost:4000/health`.
4. During local Compose use, Swagger is available at `http://localhost:4000/api-docs`; it is disabled by default outside this configuration.

The images use Node 22 Alpine, multi-stage builds, npm lockfiles, standalone Next output, non-secret build arguments for public client configuration, and `.dockerignore` rules that exclude `.env`, logs, build output, and dependencies.

Production deployments must supply unique JWT access/refresh secrets, a dedicated `TWO_FACTOR_ENCRYPTION_KEY`, production MongoDB, approved client origins, real payment/asset/email configuration, and an external TLS/reverse-proxy layer. Do not use the local MongoDB container, development `NODE_ENV`, placeholder values, or exposed API documentation in production.
