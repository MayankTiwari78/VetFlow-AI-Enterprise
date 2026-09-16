import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import {
  LOCAL_DEVELOPMENT_ORIGINS,
  createCorsOriginPolicy,
  parseOriginList,
  parseProjectSlugs
} from "../src/config/cors.js";

/**
 * Production topology covered here: the Vercel apps (the production domain plus
 * `*-*.vercel.app` preview deployments) call the Render API with
 * `withCredentials: true`, so every accepted origin must receive an explicit
 * `Access-Control-Allow-Origin` echo (never a `*` wildcard) plus
 * `Access-Control-Allow-Credentials: true`, and OPTIONS preflight must succeed.
 */

process.env.NODE_ENV = "test";
process.env.PORT = "4200";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/vetflow-cors-test";
process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-enough-length";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-enough-length";
process.env.CLIENT_URL = "https://vet-flow-ai-enterprise.vercel.app";
process.env.ADMIN_URL = "https://console.vetflow-ai.example.com";
process.env.CORS_ALLOWED_ORIGINS =
  "https://vetflow-ai-enterprise-preview.vercel.app/, https://custom-clinic.example.org";
process.env.CORS_VERCEL_PREVIEW_PROJECTS = "vet-flow-ai-enterprise";
process.env.ADMIN_EMAIL = "admin@example.com";
process.env.ADMIN_PASSWORD = "Password123";
process.env.RAZORPAY_KEY_ID = "rzp_test";
process.env.RAZORPAY_KEY_SECRET = "rzp_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_secret";
process.env.LOG_LEVEL = "silent";

const registerPath = "/api/user/register";
const productionOrigin = "https://vet-flow-ai-enterprise.vercel.app";
const branchPreviewOrigin = "https://vet-flow-ai-enterprise-git-main-mayanktiwari78.vercel.app";
const hashPreviewOrigin = "https://vet-flow-ai-enterprise-7f3c9a1b42-mayanktiwari78.vercel.app";
const configuredPreviewOrigin = "https://vetflow-ai-enterprise-preview.vercel.app";
const consoleOrigin = "https://console.vetflow-ai.example.com";
const customOrigin = "https://custom-clinic.example.org";

const preflight = (app: Express, path: string, origin: string) =>
  request(app)
    .options(path)
    .set("Origin", origin)
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type, token");

const expectCredentialedCorsHeaders = (response: request.Response, origin: string) => {
  expect(response.headers["access-control-allow-origin"]).toBe(origin);
  expect(response.headers["access-control-allow-origin"]).not.toBe("*");
  expect(response.headers["access-control-allow-credentials"]).toBe("true");
};


describe("VetFlow-AI CORS origin policy", () => {
  let app: Express;

  beforeAll(async () => {
    app = (await import("../src/app.js")).default;
  });

  it("answers the /api/user/register preflight for the production Vercel app", async () => {
    const response = await preflight(app, registerPath, productionOrigin).expect(204);

    expectCredentialedCorsHeaders(response, productionOrigin);
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-methods"]).toContain("OPTIONS");
    expect(response.headers["access-control-allow-headers"]).toContain("content-type");
    expect(response.headers["access-control-allow-headers"]).toContain("token");
    expect(response.headers.vary).toContain("Origin");
  });

  it("answers the /api/user/register preflight for Vercel preview deployments", async () => {
    for (const origin of [branchPreviewOrigin, hashPreviewOrigin, configuredPreviewOrigin]) {
      const response = await preflight(app, registerPath, origin).expect(204);

      expectCredentialedCorsHeaders(response, origin);
    }
  });

  it("answers preflight for the console URL and extra configured origins", async () => {
    for (const origin of [consoleOrigin, customOrigin]) {
      const response = await preflight(app, registerPath, origin).expect(204);

      expectCredentialedCorsHeaders(response, origin);
    }
  });

  it("carries credentialed CORS headers on a real POST /api/user/register request", async () => {
    const response = await request(app)
      .post(registerPath)
      .set("Origin", productionOrigin)
      .set("Content-Type", "application/json")
      .send({ name: "A", email: "not-an-email", password: "short" })
      .expect(400);

    // The 400 comes from body validation inside the router, which proves the
    // request was not rejected by CORS and reached /api/user/register.
    expect(response.body.message).toBe("Validation failed");
    expectCredentialedCorsHeaders(response, productionOrigin);
  });

  it("carries credentialed CORS headers on other API responses", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", productionOrigin)
      .expect(200);

    expect(response.body.data.status).toBe("ok");
    expectCredentialedCorsHeaders(response, productionOrigin);
  });

  it("rejects origins that are not the app or one of its deployments", async () => {
    const rejectedOrigins = [
      "https://evil.example.com",
      "https://vet-flow-ai-enterprise.vercel.app.evil.example.com",
      "https://vet-flow-ai-enterprise.evil.example.com",
      "https://vet-flow-ai-enterprise-preview.evil.example.com",
      "https://not-vet-flow-ai-enterprise.vercel.app",
      "https://some-other-project.vercel.app",
      "https://evil.vercel.app",
      "https://vercel.app",
      "http://vet-flow-ai-enterprise.vercel.app",
      "https://vet-flow-ai-enterprise.vercel.app:8443"
    ];

    for (const origin of rejectedOrigins) {
      const response = await preflight(app, registerPath, origin).expect(403);

      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
      expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
      expect(response.body.message).toBe("Origin is not allowed by CORS");
    }
  });
});


describe("shared CORS origin policy", () => {
  it("trusts the local development servers outside production only", () => {
    const development = createCorsOriginPolicy({ isDevelopment: true });

    for (const origin of LOCAL_DEVELOPMENT_ORIGINS) {
      expect(development.isAllowedOrigin(origin)).toBe(true);
    }

    const production = createCorsOriginPolicy({ isDevelopment: false });

    expect(production.isAllowedOrigin("http://localhost:3000")).toBe(false);
    expect(production.isAllowedOrigin("http://127.0.0.1:3001")).toBe(false);
  });

  it("normalises configured origins and matches Vercel deployments by project prefix", () => {
    const policy = createCorsOriginPolicy({
      clientUrl: "https://vet-flow-ai-enterprise.vercel.app/",
      vercelPreviewProjects: parseProjectSlugs("Vet-Flow-AI-Enterprise, not_a_slug")
    });

    expect(policy.allowedOrigins.has("https://vet-flow-ai-enterprise.vercel.app")).toBe(true);
    expect(policy.vercelPreviewProjects).toEqual(["vet-flow-ai-enterprise"]);
    expect(policy.isAllowedOrigin("https://vet-flow-ai-enterprise-git-main-team.vercel.app")).toBe(
      true
    );
    expect(policy.isAllowedOrigin("https://vet-flow-ai-enterprise.preview.example.com")).toBe(
      false
    );
  });

  it("never falls back to a wildcard allow-origin value", () => {
    const policy = createCorsOriginPolicy({
      clientUrl: "https://vet-flow-ai-enterprise.vercel.app"
    });

    expect(policy.isAllowedOrigin(undefined)).toBe(false);
    expect(policy.isAllowedOrigin("null")).toBe(false);
    expect(policy.isAllowedOrigin("*")).toBe(false);
    expect([...policy.allowedOrigins]).not.toContain("*");
  });

  it("reports unusable entries in a configured origin list", () => {
    const parsed = parseOriginList(
      "ftp://files.example.com, not-an-origin, https://ok.example.com/"
    );

    expect(parsed.origins).toEqual(["https://ok.example.com"]);
    expect(parsed.invalid).toEqual(["ftp://files.example.com", "not-an-origin"]);
  });
});