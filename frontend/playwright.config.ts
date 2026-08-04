import { defineConfig, devices } from "@playwright/test";

const patientPort = Number(process.env.PATIENT_E2E_PORT ?? 3100);
const portalPort = Number(process.env.PORTAL_E2E_PORT ?? 3101);
const patientBaseURL = `http://127.0.0.1:${patientPort}`;
const portalBaseURL = `http://127.0.0.1:${portalPort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: patientBaseURL,
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${patientPort}`,
      url: patientBaseURL,
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: `npm --prefix ../admin run dev -- --hostname 127.0.0.1 --port ${portalPort}`,
      url: portalBaseURL,
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
});
